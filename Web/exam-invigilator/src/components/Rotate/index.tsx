import { useState } from 'react';
import { RotateRightSvg } from "@/assets/CustomIcon";
import styles from './index.less';

import type { SyntheticEvent } from 'react';

interface IProps {
  onDegreeChange: (degree: number) => void;
  styles?: React.CSSProperties;
}

const Rotate = (props: IProps) => {
  const [rotateDegree, setRotateDegree] = useState(0);

  const handleRotate = () => {
    const step = 90;
    const value = rotateDegree === 3 * step ? 0 : rotateDegree + step;
    setRotateDegree(value);
    props.onDegreeChange(value);
  }

  const stopPropagation = (e: SyntheticEvent) => {
    e.stopPropagation();
  }

  return (
    <span
      className={styles.rotate}
      onClick={handleRotate}
      onDoubleClick={stopPropagation}
      style={props.styles}
    >
      <RotateRightSvg />
    </span>
    )
}

export default Rotate;