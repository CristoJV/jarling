import type { PropsWithChildren } from 'react';

import { ModalScaffold } from '@/presentation/components/common/modal-scaffold';

type Props = PropsWithChildren<
  Readonly<{
    onDismiss: () => void;
    visible?: boolean;
    keyboardAvoiding?: boolean;
  }>
>;

export function AnimatedBottomSheetModal(props: Props) {
  return <ModalScaffold {...props} placement="bottom" />;
}
