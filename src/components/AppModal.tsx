import { Modal as RNModal, ModalProps as RNModalProps } from 'react-native';

export type AppModalProps = Omit<RNModalProps, 'onModalHide'> & {
  onModalHide?: () => void;
};



export const AppModal: React.FC<AppModalProps> = (props) => {

  return (
    <RNModal
      {...(props as any)}
      accessibilityViewIsModal={props.accessibilityViewIsModal ?? true}
    />
  );
};

export default AppModal;
