import React from 'react';
import { Modal as RNModal, ModalProps as RNModalProps } from 'react-native';

export type AppModalProps = Omit<RNModalProps, 'onModalHide'> & {
  onModalHide?: () => void;
};

/**
 * Thin wrapper around React Native's <Modal> that adds the `onModalHide`
 * callback which is available at runtime on iOS/Android but missing from the
 * upstream TypeScript declarations.
 */
export const AppModal: React.FC<AppModalProps> = (props) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <RNModal
      {...(props as any)}
      accessibilityViewIsModal={props.accessibilityViewIsModal ?? true}
    />
  );
};

export default AppModal;
