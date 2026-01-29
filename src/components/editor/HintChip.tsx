import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  text: string;
};

export function HintChip({ text }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  text: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
    textAlign: 'center',
  },
});
