import { StandaloneInvitationView } from './components/StandaloneInvitationView';

/** Lightweight entry for external guest links (?invite=slug): no venues/admin/etc. code. */
export default function GuestApp({ slug }: { slug: string }) {
  return <StandaloneInvitationView slug={slug} allowReturnToPreviewHost={false} />;
}
