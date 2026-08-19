import type { PropsWithChildren } from 'react';

import { ModalScaffold } from '@/presentation/components/common/modal-scaffold';

type Props = PropsWithChildren<
  Readonly<{ onDismiss: () => void; keyboardAvoiding?: boolean }>
>;

export function AnimatedCenteredModal(props: Props) {
  return <ModalScaffold {...props} placement="center" />;
}
