import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

type Props = {
  /** 화면 중앙에 표시될 가이드 크기(픽셀) */
  size?: number;
};

/**
 * '밥그릇' 느낌의 가이드 오버레이.
 * - 중앙에 bowl shape 라인
 * - 바깥은 은은하게 디밍
 */
export function BowlGuideOverlay({ size = 280 }: Props) {
  const half = size / 2;
  const stroke = 4;

  // bowl path (simple): rim + U shape
  const bowlWidth = size;
  const bowlHeight = size * 0.62;
  const x0 = -half;
  const y0 = -bowlHeight / 2;

  const rimY = y0 + bowlHeight * 0.12;
  const leftX = x0 + bowlWidth * 0.12;
  const rightX = x0 + bowlWidth * 0.88;

  const bottomY = y0 + bowlHeight * 0.88;
  const cpOffsetX = bowlWidth * 0.18;

  const d = [
    // rim
    `M ${leftX} ${rimY}`,
    `L ${rightX} ${rimY}`,
    // bowl
    `M ${leftX + bowlWidth * 0.06} ${rimY + bowlHeight * 0.06}`,
    `C ${leftX + cpOffsetX} ${bottomY}, ${rightX - cpOffsetX} ${bottomY}, ${rightX - bowlWidth * 0.06} ${rimY + bowlHeight * 0.06}`,
  ].join(' ');

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.25)" />
      </Svg>

      <View style={styles.center}>
        <Svg width={size} height={size} viewBox={`${-half} ${-half} ${size} ${size}`}>
          <Rect
            x={-half}
            y={-half}
            width={size}
            height={size}
            rx={28}
            ry={28}
            fill="transparent"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={2}
          />
          <Path d={d} stroke="rgba(255,255,255,0.92)" strokeWidth={stroke} strokeLinecap="round" fill="none" />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
