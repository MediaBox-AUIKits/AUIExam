import React from 'react';
import { Button } from 'antd';
import styles from './index.less';

interface IProps {
  icon: JSX.Element,
  height: number,
  info: string,
  btnConfig: {
    onClick: () => void,
    btnText: string,
  }[],
}

const InfoTipBoard: React.FC<IProps> = (props: IProps) => {
  const { icon, height, info, btnConfig} = props;

  return (
    <div style={{height: `${height}px`}} className={styles.board}>
      <div>
        {icon}
        <div className={styles.info}>{info}</div>
        <div>
          {
            btnConfig?.map((item, index) => (
              <Button
                type={index === 0 ? 'primary' : 'default'}
                onClick={item.onClick}
                className={styles.btn}
                key={item.btnText}
              >
                {item.btnText}
              </Button>
            ))
          }
        </div>
      </div>
    </div>
  );
}

export default InfoTipBoard;
