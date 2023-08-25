import React from 'react';
import styles from './index.less';

interface CardProps {
  title: string;
  children?: React.ReactNode
}

const Card: React.FC<CardProps> = (props: CardProps) => {
  const { title, children } = props;
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
      </div>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
};

export default Card;
