/**
 * 作弊检测模块
 */
import React, { useMemo, useContext, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { PublishStatus } from '@/types';
import { ExamContext } from '@/context/exam';
import services from '@/utils/services';
import { reporter } from '@/utils/Reporter';
import Result from './Result';

declare const AliyunDetectEngine: any;

interface ICheatDetectionProps {
  device: 'pc' | 'mobile';
  publishStatus: PublishStatus;
  resultVisible?: boolean;
}

const CheatDetection: React.FC<ICheatDetectionProps> = (props) => {
  const { publishStatus, device, resultVisible } = props;
  const { state, interaction } = useContext(ExamContext);
  const { roomInfo, userInfo } = state;
  const cheatEngine = useRef<any>();
  const detectMessages = useRef<any[]>([]); // 5s内检测的作弊消息

  const [detectResult, setDetectResult] = useState<any>();
  const [detectConfig, setDetectConfig] = useState<any>();

  const isOpenDetect = useMemo(() => {
    // 用户licenseKey未配置，不开启作弊检测
    return CONFIG.cheatDetect.licenseKey !== '';
  }, []);

  if (!isOpenDetect) {
    return null;
  }

  useEffect(() => {
    let timer: any = null;
    if (roomInfo && isOpenDetect) {
      timer = setInterval(() => {
        let headUpDownCount = 0, headShakingCount = 0, msgSet = new Set();
        const msgRes = detectMessages.current.filter(msg => {
          if (msg.detectType == "headUpDown") {
            headUpDownCount++
            return headUpDownCount === 2
          }
          if (msg.detectType == "headShaking") {
            headShakingCount++
            return headShakingCount === 2
          }
          if (msgSet.has(msg.detectType)) {
            return false
          } else {
            msgSet.add(msg.detectType)
            return true
          }
        }).map(item => {
          item.detectTime = dayjs().valueOf();
          // 目前 pc 为主机位，mobile 为副机位，若有变化需要同步更新
          item.isMainMonitor = device === 'pc';
          item.userId = userInfo?.id;
          return item;
        });
  
        if (msgRes.length > 0) {
          services.uploadDetectMessage({
            examId: roomInfo.examId,
            roomId: roomInfo.id,
            data: JSON.stringify(msgRes)
          }).then(() => {
            //
          }).catch((err) => {
            console.log(err)
          });
    
          interaction.sendDetectMessage(msgRes);
        }
  
        detectMessages.current = [];
      }, 5000);
    }
    return () => {
      timer && clearInterval(timer);
    }
  }, [interaction, roomInfo, userInfo, isOpenDetect, device]);

  const detectRuleList = [
    {
      detectType: "scenePersonExit",
      rule: detectResult?.scenePersonExit === 1 && detectResult?.faceCount === 0,
      message: `${userInfo?.name}疑似离开了`,
    },
    {
      detectType: "manyPeople",
      rule: detectResult?.faceCount > 1,
      message: `${userInfo?.name}画面疑似有多个人`,
    },
    {
      detectType: "actionPoseStandup",
      rule: detectResult?.actionPoseStandup > 0.8,
      message: `${userInfo?.name}疑似起立了`,
    },
    {
      detectType: "actionHeadUpDown",
      rule: detectResult?.actionHeadUpDown > 0.8,
      message: `${userInfo?.name}疑似频繁点头`,
      triggerCount: 2, // 5s两次
    },
    {
      detectType: "headShaking",
      rule: detectResult?.actionHeadLeftRight > 0.8 || detectResult?.actionHeadShaking > 0.8,
      message: `${userInfo?.name}疑似频繁转头/摇头`,
      triggerCount: 2, // 5s两次
    },
    {
      detectType: "watch",
      rule: detectResult?.objectDetectWatch > 0.5,
      message: `${userInfo?.name}疑似戴手表`,
    },
    {
      detectType: "earPhone",
      rule: detectResult?.objectHeadPhone > 0.3 || detectResult?.objectEarPhone > 0.3,
      message: `${userInfo?.name}疑似戴耳机`,
    },
    {
      detectType: "cellPhone",
      rule: detectResult?.objectDetectCellPhone > 0.3,
      message: `${userInfo?.name}疑似打电话`,
    },
    {
      detectType: "actionPersonSpeech",
      rule: detectResult?.actionPersonSpeech > 0.8,
      message: `${userInfo?.name}疑似现场有人说话`,
    },
    {
      detectType: "actionPoseHandup",
      rule: detectResult?.actionPoseHandup > 0.8,
      message: `${userInfo?.name}疑似举手了`,
    },
  ].filter(item => {
    if (!detectConfig) return false;
    if (item.detectType === "watch" || item.detectType === "earPhone" || item.detectType === "cellPhone") {
      return detectConfig.objectDetect;
    }
    return detectConfig[item.detectType];
  });

  useEffect(() => {
    if (detectResult) {
      detectRuleList.forEach((item) => {
        if (item.rule) {
          detectMessages.current.push({
            detectType: item.detectType,
            extraInfo: {
              message: item.message,
            }
          });
        }
      })
    }
  }, [detectResult]);

  const initCheatEngine = async () => {
    if (!isOpenDetect || cheatEngine.current) {
      return;
    }
    
    let config = {
      fps: 5,
      objectDetect: false, //电子设备检测
      scenePersonEnter: false, //人物进入  不需要
      scenePersonExit: false, //离开
      scenePersonInRectRatio: false, //画面占比  不需要
      actionHeadUpDown: false, //低/抬头
      actionHeadLeftRight: false, //转头
      actionHeadShaking: false, //摇头
      actionPoseStandup: false, //起立
      actionPoseSitting: false, //坐下  不需要
      actionPoseHandup: false, //举手
      actionPersonSpeech: false, //声音
      licenseKey: CONFIG.cheatDetect.licenseKey,
      licenseDomain: CONFIG.cheatDetect.licenseDomain,
    };

    const resConfigData = await services.getCheatConfig(roomInfo?.examId || '');
    let deviceDetectConfig: any = {};
    try {
      // 区分设备，从 pc 或 mobile 字段取配置数据
      deviceDetectConfig = JSON.parse(resConfigData.data)[device] || {};
    } catch (err) {
      reporter.cheactDetectionError('parse config', err);
    }
    // 检查是否配置项是否有 true ，若一个都没有，说明不需要检测，不需要初始化 cheatEngine
    const bool = Object.values(deviceDetectConfig).some((value) => value === true);
    if (!bool) {
      reporter.cheactDetectionNeedless(deviceDetectConfig);
      return;
    }

    setDetectConfig(deviceDetectConfig);
    const cloneConfig = {...deviceDetectConfig};
    delete cloneConfig.manyPeople; // sdk默认检测人数，不需要这项输入，同时要去掉多人检测结果的输出
    if (cloneConfig.headShaking) { // 创建考场时若选择转头/摇头检测，需要开启两项sdk检测配置
      config.actionHeadLeftRight = true;
      config.actionHeadShaking = true;
    }
    delete cloneConfig.headShaking;
    config = {
      ...config,
      ...cloneConfig
    };

    const engine = new AliyunDetectEngine();
    await engine.init(config);

    const video = document.querySelector('#local-previewer');
    if (video) {
      engine.startDetect(video);
    }
    engine.on('detectResult', (result: any) => {
      setDetectResult(result);
    });
    cheatEngine.current = engine;
    reporter.cheactDetectionInited(cloneConfig);
  }

  useEffect(() => {
    if (publishStatus === PublishStatus.success) {
      initCheatEngine().catch((err) => {
        reporter.cheactDetectionError('inited', err);
      });
    }
  }, [publishStatus]);

  useEffect(() => {
    return () => {
      cheatEngine.current?.destroy();
    }
  }, []);

  return device === 'pc' && resultVisible ? <Result detectResult={detectResult} /> : null
}

export default CheatDetection;
