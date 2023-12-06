/**
 * 作弊检测结果展示模块
 */
import React from 'react';
import styles from './Result.less';

interface IResultProps {
  detectResult: any;
}

const Result: React.FC<IResultProps> = (props) => {
  const { detectResult } = props;

  const detectList = [
    'scenePersonInRectRatio',
    'scenePersonEnter',
    'scenePersonExit',
    'objectDetectCellPhone',
    'objectDetectHat',
    'objectDetectWatch',
    'objectHeadPhone',
    'objectEarPhone',
    'actionHeadUpDown',
    'actionHeadLeftRight',
    'actionHeadShaking',
    'actionPoseStandup',
    'actionPoseSitting',
    'actionPoseHandup',
    'actionPersonSpeech',
  ];

  const detectNameMap = {
    // 0: '设备在左侧',
    scenePersonInRectRatio: '画面占比',
    // 1: '光线过暗',
    // 2: '光线过度',
    scenePersonEnter: '人物进入',
    scenePersonExit: '人物离开',
  
    objectDetectCellPhone: '打电话',
    objectDetectHat: '戴帽子',
    objectDetectWatch: '戴手表',
    objectHeadPhone: '戴头式耳机',
    objectEarPhone: '戴入耳式耳机',
  
    actionHeadUpDown: '低/抬头',
    actionHeadLeftRight: '转头',
    actionHeadShaking: '摇头',
    actionPoseStandup: '起立',
    actionPoseSitting: '坐下',
    actionPoseHandup: '举手',
  
    actionPersonSpeech: '人声检测',
  };

  type DetectKeys = keyof typeof detectNameMap;

  const getDisplayName = (key: DetectKeys) => {
    return detectNameMap[key] || '';
  };

  return (
    <div className={styles['result']}>
      <h1>检测结果实时展示</h1>
      <div>
        提示：
        <ol>
          <li>起立(需要全身在画面中，通常在侧机位使用)</li>
          <li>坐下(需要全身在画面中，通常在侧机位使用)</li>
        </ol>
      </div>
      <div className={styles['card-divider']} />
      {detectResult && (
        <>
          检测人数：<kbd>{detectResult.faceCount}</kbd>
          <ul className={styles['result-list']}>
            {detectList.map((item: any) => {
              return (
                <li key={item}>
                  {getDisplayName(item)}
                  <div className={styles['progress']}>
                    <div className={styles['_inner']} style={{ width: ((detectResult[item] || 0) * 100).toFixed(2) + '%' }}>
                      <span className={styles['_text']}>{((detectResult[item] || 0) * 100).toFixed(2) + '%'}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export default Result;
