import React, { useState, useRef, useEffect, useContext } from 'react';
import { Radio, Button, Select, Progress, Alert } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import type { RadioChangeEvent } from 'antd';
import InfoTipBoard from '../InfoTipBoard';
import {
  AudioPauseSvg,
  AudioPlaySvg,
  MicPreviewSvg,
  CameraErrorSvg,
  MicErrorSvg,
  SpeakerErrorSvg,
  StartScreenSvg,
  ScreenErrorSvg,
  InfoCircleFill,
} from '@/assets/CustomIcon';
import { AliRTS } from "aliyun-rts-sdk";
import { history } from "umi";
import dayjs from 'dayjs';
import type { FacingMode } from '../../../node_modules/media-device/dist/core/interface.d.ts';
import styles from './index.less';
import classNames from 'classnames';
import { LocalStream } from 'aliyun-rts-sdk/dist/core/interface';
import { ExamContext } from '@/context/exam';

enum CurrentStep {
  Camera = 0,
  Microphone = 1,
  Speaker = 2,
  Screen = 3,
}

enum ConfirmRadioEnum {
  Yes = 0,
  No = 1,
}

interface MediaDeviceInfo {
  deviceId: string,
  groupId: string,
  kind: string,
  label: string,
}

interface IProps {
  current: CurrentStep,
  setEnterStatus: React.Dispatch<React.SetStateAction<boolean>>,
  setCurrent: React.Dispatch<React.SetStateAction<number>>,
  totalStepsNumber: number,
}

const DeviceTestStepContent: React.FC<IProps> = (props: IProps) => {
  const { current, setEnterStatus, setCurrent, totalStepsNumber } = props;

  const { dispatch } = useContext(ExamContext);

  const [confirmRadioValue, setConfirmRadioValue] = useState<ConfirmRadioEnum>(ConfirmRadioEnum.No);
  const [deviceList, setDeviceList] = useState<Array<MediaDeviceInfo>>([] as MediaDeviceInfo[]);
  const [deviceId, setDeviceId] = useState<string>('');
  const [createStreamSuccess, setCreateStreamSuccess] = useState<boolean>(true);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isScreenStart, setIsScreenStart] = useState<boolean>(false);
  const [screenStream, setScreenStream] = useState<LocalStream | null>(null);
  const [duration, setDuration] = useState<(number | null)>(null);
  const [canplay, setCanplay] = useState<boolean>(false);
  const [deviceInfo, setDeviceInfo] = useState<{audio: string, video: string}>({audio: '', video: ''});

  const videoRef = useRef<HTMLVideoElement>(null);
  const speakerAudio = useRef<HTMLAudioElement>(null);
  let timerId: any = useRef(null);

  const CurrentTestDevice = ['摄像头', '麦克风', '扬声器', '屏幕共享'];
  const confirmByYouselfText = [
    '摄像头已开启，能看到摄像头画面请选择“是”，不能看到请选择“否”',
    '请对着麦克风说话。能看到上方音量条变化请选择“是”，不能看到变化请选择“否”',
    '请点击播放按钮，能正常听到声音请选择“是”，不能听到请选择“否”',
    '屏幕共享已开启，能看到共享画面请选择“是”，不能看到请选择“否”',
  ];

  const onDeviceRetry = () => {
    updateDeviceList();
    createStream(deviceId);
  }

  const linkToGuide = () => {
    window.open('https://help.aliyun.com/zh/live/user-guide/remote-proctoring-demo?spm=a2c4g.11186623.0.0.7eda1d85UJ4jjN#c799bbe0d86j3');
  }

  const commonBtnConfig = [{
    onClick: onDeviceRetry,
    btnText: '刷新',
  }, {
    onClick: linkToGuide,
    btnText: '操作指引'
  }];

  const InfoTipBoardConfig = {
    CameraError: {
      icon: <CameraErrorSvg/>,
      height: 212,
      info: '启动摄像头失败，请确认设备已连接摄像头并在浏览器中打开。',
      btnConfig: commonBtnConfig,
    },
    MicError: {
      icon: <MicErrorSvg/>,
      height: 157,
      info: '启动麦克风失败，请确认设备已连接麦克风并在浏览器中打开。',
      btnConfig: commonBtnConfig,
    },
    SpeakerError: {
      icon: <SpeakerErrorSvg/>,
      height: 157,
      info: '启动声音输出设备失败，请确认设备已正常连接扬声器，并在浏览器中打开。',
      btnConfig: commonBtnConfig,
    },
    StartScreen: {
      icon: <StartScreenSvg/>,
      height: 212,
      info: '当前未启动屏幕共享，请点击“启动屏幕共享”后，务必选择“整个屏幕”进行共享。',
      btnConfig: [{
        onClick: onDeviceRetry,
        btnText: '启动屏幕共享',
      }]
    },
    ScreenError: {
      icon: <ScreenErrorSvg/>,
      height: 212,
      info: '屏幕共享失败，请确认设备是否正常。',
      btnConfig: commonBtnConfig,
    },
  }

  useEffect(() => {
    if (screenStream && screenStream?.videoTrack) {
      screenStream?.videoTrack.addEventListener('ended', stopScreenShare)
    }
    return () => {
      if (screenStream && screenStream?.videoTrack) {
        screenStream?.videoTrack.removeEventListener('ended', stopScreenShare);
      }
    };
  }, [screenStream, current]);

  const stopScreenShare = () => {
    if (current === CurrentStep.Screen) {
      setCreateStreamSuccess(false);
    }
  };

  useEffect(() => {
    speakerAudio.current?.addEventListener('ended', handleAudioEnd);
    return () => {
      clearInterval(timerId.current);
      speakerAudio.current?.removeEventListener('ended', handleAudioEnd);
    };
  }, []);

  useEffect(() => {
    if (current === CurrentStep.Speaker) {
      setIsAudioPlaying(false);
    }
    if (current !== CurrentStep.Screen) {
      updateDeviceList();
    }
  }, [current]);

  useEffect(() => {
    createStream(deviceId);
  }, [deviceId]);
  
  useEffect(() => {
    setDeviceId(deviceList[0]?.deviceId);
    if (current === CurrentStep.Microphone || current === CurrentStep.Speaker) {
      // 两种case不能触发deviceId的useEffect：
      // 1. 因为麦克风设备列表变化时， 第一个设备始终为deviceId: 'default'
      // 2. 麦克风列表切扬声器，第一个设备id为default
      createStream(deviceId);
    }
  }, [deviceList]);

  useEffect(() => {
    navigator.mediaDevices.addEventListener('devicechange', updateDeviceList);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', updateDeviceList);
    };
  }, []);

  const createStream = async(deviceId: string) => {
    if (current === CurrentStep.Speaker) {
      setCreateStreamSuccess(deviceList.length > 0);
      // setSinkId仅chrome和edge浏览器支持
      (speakerAudio?.current as any)?.setSinkId(deviceId);
      return
    }
    if (current === CurrentStep.Screen) {
      setIsScreenStart(true);
      setCreateStreamSuccess(true);
    }

    const config = {
      audio: (current === CurrentStep.Microphone) ? {
        deviceId: deviceId,
      } : false,
      video: current === CurrentStep.Camera ? {
        deviceId: deviceId,
        facingMode: "user" as FacingMode,
      } : false,
      screen: !!(current === CurrentStep.Screen),
    }

    if (current === CurrentStep.Camera) {
      updateDeviceInfo({video: deviceId})
    }

    if (current === CurrentStep.Microphone) {
      updateDeviceInfo({audio: deviceId})
    }

    await AliRTS.createStream(config).then((localStream) => {
      setCreateStreamSuccess(true);
      // 预览推流内容，mediaElement是媒体标签audio或video
      current === CurrentStep.Screen && setScreenStream(localStream)
      if (current === CurrentStep.Camera || current === CurrentStep.Screen) {
        localStream.on('videoTrackEnded', () => {
          onTrackEnded();
        });
        localStream.play(videoRef.current as HTMLVideoElement);
      } else if (current === CurrentStep.Microphone) {
        localStream.on('audioTrackEnded', () => {
          onTrackEnded();
        });
        visualizeAudioStream(localStream.mediaStream);
      }
    }).catch((err) => {
      // 创建本地流失败
      setCreateStreamSuccess(false);
      console.log("设备检测创建本地流失败", err);
    })
  };

  const onTrackEnded = () => {
    setCreateStreamSuccess(false);
  }

  const getDeviceList = (current: CurrentStep) => {
    if (current === CurrentStep.Camera) {
      return AliRTS.getCameraList();
    } else if (current === CurrentStep.Microphone) {
      return  AliRTS.getMicList();
    } else if (current === CurrentStep.Speaker) {
      return AliRTS.getSpeakerList();
    }
  };

  const updateDeviceList = () => {
    if (current !== CurrentStep.Screen) {
      getDeviceList(current)?.then(res => {
        setDeviceList(current !== CurrentStep.Microphone ? res : res.slice(1));
      })
    }
  };

  const handleSelectChange = (value: string) => {
    setDeviceId(value);
  };

  const onConfirmRadioChange = (e: RadioChangeEvent) => {
    setConfirmRadioValue(e.target.value);
  };

  const onBackEntranceBtnClick = () => {
    setEnterStatus(false);
  };

  const onBackOneStepBtnClick = () => {
    if (screenStream) {
      screenStream?.videoTrack?.stop();
      setScreenStream(null);
      setIsScreenStart(false);
    }
    setCreateStreamSuccess(true);
    if (current === CurrentStep.Speaker) {
      pausePlaying();
    }
    setCurrent(current-1);
  };

  const onNextStepBtnClick = () => {
    setCreateStreamSuccess(true);
    setCanplay(false);
    if (current === CurrentStep.Speaker) {
      pausePlaying();
    }
    if(current < totalStepsNumber) {
      setCurrent(current+1);
      setConfirmRadioValue(ConfirmRadioEnum.No);
    } else if (current === totalStepsNumber) {
      screenStream?.videoTrack?.stop();
      // 开始考试
      history.push('/pc');
    }
  };

  const visualizeAudioStream = (localStream: MediaStream) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    const audioInput = audioContext.createMediaStreamSource(localStream);
    
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048; // 设置FFT的大小，决定声音的可视化精度
    audioInput.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      if (current !== CurrentStep.Microphone) return;
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray); // 获取当前声音频率数据

      const volume = dataArray.reduce((acc, cur) => acc + cur) / bufferLength;

      const volumeBar = document.getElementById('volume-bar') as HTMLElement;
      if (!volumeBar) return;

      const childNodes = Array.from(volumeBar.children) as HTMLElement[];
      for (let i = 0; i < childNodes.length; i++) {
        const childStyle = childNodes[i].style;
        const isChangeStyle = !!(i+1 < volume / 100 * childNodes.length);
        childStyle.backgroundColor = isChangeStyle ? '#1597FF' : '#E6E7EC';
        childStyle.border = isChangeStyle ? '' : '0.5px solid #B2B7C4';
      }
    }
    draw();
  }

  const togglePlaying = () => {
    if (isAudioPlaying) {
      pausePlaying();
    } else {
      startPlaying();
    }
  }
  
  const startPlaying = () => {
    setIsAudioPlaying(true);
    (speakerAudio?.current as HTMLAudioElement).currentTime = currentTime;
    speakerAudio.current?.play();
    timerId.current = setInterval(updateProgress, 100);
  }

  const pausePlaying = () => {
    clearInterval(timerId.current)
    setIsAudioPlaying(false)
    speakerAudio.current?.pause();
  }

  const updateProgress = () => {
    const currentTime = speakerAudio.current?.currentTime || 0;
    const progressPercentage = (currentTime / (duration as number) * 100);
    setCurrentTime(currentTime);
    setProgressPercentage(progressPercentage);
  }

  const progressTimeFormat = (time: number) => {
    return dayjs(time*1000).format('mm:ss')
  }

  const handleAudioEnd = () => {
    setIsAudioPlaying(false);
  }

  const onAudioCanPlay = () => {
    setDuration(speakerAudio?.current?.duration as number)
  }

  const onCanPlay = () => {
    setCanplay(true);
  }

  const updateDeviceInfo = (info: any) => {
    setDeviceInfo({...deviceInfo, ...info})
    dispatch({
      type: "updateDeviceInfo",
      payload: {...deviceInfo, ...info},
    });
  }

  return (
    <div className={styles['step-content']}>
      {/* 设备列表模块 */}
      {
        current !== CurrentStep.Screen && (
          <div className={styles['device-list-sec']}>
            <div className={styles['step-content-title']}>请选择{CurrentTestDevice[current]}设备</div>
            {
              current === CurrentStep.Speaker && (
                <div className={styles['speaker-alert']}>
                  <div className={styles['speaker-alert-icon']}><InfoCircleFill /></div>
                  <div className={styles['speaker-alert-text']}>
                    1.可切换不同的扬声器设备进行调试。<br />
                    2.考试中，音量调节控制的是系统中默认的声音设备，建议前往系统设置中切换相应的声音设备。
                  </div>
                </div>
              )
            }
            <Select
              id='device-select'
              value={deviceId}
              className={styles['device-list-select']}
              defaultValue={deviceList[0]?.deviceId}
              key={deviceList[0]?.deviceId}
              onChange={handleSelectChange}
              options={deviceList.map((item) => ({label: item.label, value: item.deviceId}))}
            />
          </div>
        )
      }

      {/* 摄像头预览+屏幕共享预览模块 */}
      {
        (current === CurrentStep.Camera || current === CurrentStep.Screen) && (
          <div className={styles['preview-video-sec']}>
            <div className={styles['step-content-title']}>
              {current === CurrentStep.Camera ? '预览摄像头' : '屏幕共享'}
            </div>
            {
              createStreamSuccess && (current === CurrentStep.Camera || isScreenStart) ? (
                <video
                  muted
                  ref={videoRef}
                  autoPlay
                  playsInline
                  onCanPlay={onCanPlay}
                  className={styles['preview-video']}
                />
              ) : (
                <InfoTipBoard {...(
                  current === CurrentStep.Camera ? InfoTipBoardConfig.CameraError : (
                    isScreenStart ? InfoTipBoardConfig.ScreenError : InfoTipBoardConfig.StartScreen
                  ))}
                />
              )
            }
            {
              createStreamSuccess && current === CurrentStep.Camera && !canplay && (
                <div className={styles['preview-video-loading']}>
                  <LoadingOutlined style={{fontSize: '30px'}}/>
                </div>
              )
            }
            </div>
        )
      }

      {/* 麦克风预览模块 */}
      {
        current === CurrentStep.Microphone && (
          <div className={styles['preview-mic-sec']}>
            <div className={styles['step-content-title']}>麦克风声音预览</div>
            {
              createStreamSuccess ? (
                <div className={styles['preview-mic-sec-content']}>
                  <MicPreviewSvg/>
                  <div
                    id='volume-bar'
                    className={styles['preview-mic-sec-volume-bar']}
                  >
                    {
                      (new Array(23).fill(0)).map((item, index) => (
                        <div className={styles['preview-mic-sec-volume-bar-item']} key={index}></div>
                      ))
                    }
                  </div>
                </div>
              ) : (
                <InfoTipBoard {...InfoTipBoardConfig.MicError}/>
              )
            }
          </div>
        )
      }

      {/* 扬声器音频预览模块 */}
      {
        current === CurrentStep.Speaker && (
          <div className={styles['preview-speaker-sec']}>
            <div className={styles['step-content-title']}>音频预览</div>
            {
              createStreamSuccess ? (
                <div className={styles['preview-speaker-sec-content']}>
                  {
                    isAudioPlaying ? <AudioPlaySvg onClick={togglePlaying}/> :
                      <AudioPauseSvg onClick={togglePlaying}/>
                  }
                  <Progress
                    percent={progressPercentage}
                    status="active"
                    className={styles['preview-speaker-sec-progress']}
                    showInfo={false}
                    strokeWidth={4}
                  />
                  <div className={styles['preview-speaker-sec-timer']}>
                    {duration && (progressTimeFormat(currentTime) + '/' + progressTimeFormat(duration))}
                  </div>
                  <audio
                    src="https://ice-pub-media.myalicdn.com/vod-demo/mp3/%E8%80%83%E5%89%8D%E9%A1%BB%E7%9F%A5.mp3"
                    onCanPlay={onAudioCanPlay}
                    ref={speakerAudio}
                  />
                </div>
              ) : (
                <InfoTipBoard {...InfoTipBoardConfig.SpeakerError}/>
              )
            }
          </div>
        )
      }

      {/* 自行确认设备是否正常模块 */}
      {
        createStreamSuccess && (current !== CurrentStep.Screen || isScreenStart) && (
          <div className={styles['confirm-youself']}>
            <div className={styles['confirm-youself-title']}>{confirmByYouselfText[current]}</div>
            <Radio.Group onChange={onConfirmRadioChange} value={confirmRadioValue}>
              <Radio value={ConfirmRadioEnum.Yes}>是</Radio>
              <Radio value={ConfirmRadioEnum.No}>否</Radio>
            </Radio.Group>
          </div>
        )
      }

      {/* 底部按钮模块 */}
      <div className={styles['btn-wrap']}>
        <Button
          className={styles['btn-common']}
          onClick={onBackEntranceBtnClick}
        >
          返回考场入口
        </Button>
        {
          current !== CurrentStep.Camera && (
            <Button
              className={styles['btn-common']}
              style={{marginLeft: '9px'}}
              onClick={onBackOneStepBtnClick}
            >
              上一步
            </Button>
          )
        }
        <Button
          type="primary"
          disabled={(confirmRadioValue === ConfirmRadioEnum.No) || !createStreamSuccess}
          className={classNames(styles['btn-common'] ,styles['btn-next-step'])}
          onClick={onNextStepBtnClick}
        >
          {current !== totalStepsNumber ? '下一步' : '开始考试'}
        </Button>
      </div>
    </div>
  );
}

export default DeviceTestStepContent;
