import React, { useCallback, useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AuthAndProfileView } from './components/AuthAndProfileView';
import { BookingsView } from './components/BookingsView';
import {
  CinematicPageTransition,
  ScrollProgressRibbon,
} from './components/CinematicMotion';
import { CoupleWorkspaceView, type WorkspaceTab } from './components/CoupleWorkspaceView';
import { FallingPetalsOverlay } from './components/FallingPetalsOverlay';
import { FindWeddingView } from './components/FindWeddingView';
import { HomeView } from './components/HomeView';
import { InvitationsView } from './components/InvitationsView';
import { NotFoundView } from './components/NotFoundView';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { PackagesView } from './components/PackagesView';
import { PhotographerDetailView } from './components/PhotographerDetailView';
import { PhotographersView } from './components/PhotographersView';
import { ServicesView } from './components/ServicesView';
import { StandaloneInvitationView } from './components/StandaloneInvitationView';
import { VeloraCinematicSplash } from './components/VeloraCinematicSplash';
import { VeloraHeader, type VeloraRoute } from './components/VeloraHeader';
import { VeloraWelcomeModal } from './components/VeloraWelcomeModal';
import { VenueDetailView } from './components/VenueDetailView';
import { VenuesView } from './components/VenuesView';
import { OfflineIndicator } from './hooks/usePWAInstall';
import type {
  BookingRecord,
  CoupleWorkspaceRecord,
  CustomerRequestRecord,
  ElectronicInvitationRecord,
  FavoriteRecord,
  FindWeddingInput,
  NotificationRecord,
  PhotographerRecord,
  ServiceRecord,
  TargetEntityType,
  UserProfile,
  UserRole,
  VenueRecord,
  WeddingMatchPackage,
} from './types/velora';
import { apiFetch, setClientAuthToken } from './utils/api';
import { signOutFirebase } from './utils/firebase';
import {
  computeEffectivePrice,
  createDefaultCoupleWorkspace,
} from './utils/veloraLogic';

function getInviteSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('invite');
  return slug && slug.trim() ? slug.trim() : null;
}

export default function App() {
  // External shared guest link (?invite=<slug>) — guests CANNOT navigate back to the platform
  const [guestInviteSlug, setGuestInviteSlug] = useState<string | null>(() => getInviteSlugFromUrl());
  // Internal host preview from Studio / Home — lets the host close the envelope preview back to app
  const [internalPreviewSlug, setInternalPreviewSlug] = useState<string | null>(null);
  const [route, setRoute] = useState<VeloraRoute>('home');
  const [preferredRegisterRole, setPreferredRegisterRole] = useState<UserRole | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [selectedPhotographerId, setSelectedPhotographerId] = useState<string>('');

  const [user, setUser] = useState<UserProfile | null>(null);
  const [venues, setVenues] = useState<VenueRecord[]>([]);
  const [photographers, setPhotographers] = useState<PhotographerRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [requests, setRequests] = useState<CustomerRequestRecord[]>([]);
  const [invitations, setInvitations] = useState<ElectronicInvitationRecord[]>([]);

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [workspace, setWorkspace] = useState<CoupleWorkspaceRecord>(() =>
    createDefaultCoupleWorkspace('guest')
  );
  const [workspaceInitialTab, setWorkspaceInitialTab] = useState<WorkspaceTab>('budget');
  const [notifOpen, setNotifOpen] = useState(false);

  // Cinematic Brand Splash (before entering / pre-login) & Post-Auth Welcome Popup
  const [showCinematicSplash, setShowCinematicSplash] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (getInviteSlugFromUrl()) return false;
    return !window.sessionStorage.getItem('velora_cinematic_seen');
  });
  const [welcomeUser, setWelcomeUser] = useState<UserProfile | null>(null);

  const loadPublicCatalog = useCallback(async () => {
    try {
      const [vRes, pRes, sRes, rRes, iRes] = await Promise.all([
        apiFetch<{ venues: VenueRecord[] }>('/api/venues'),
        apiFetch<{ photographers: PhotographerRecord[] }>('/api/photographers'),
        apiFetch<{ services: ServiceRecord[] }>('/api/services'),
        apiFetch<{ requests: CustomerRequestRecord[] }>('/api/requests'),
        apiFetch<{ invitations: ElectronicInvitationRecord[] }>('/api/invitations'),
      ]);
      setVenues(vRes.venues || []);
      setPhotographers(pRes.photographers || []);
      setServices(sRes.services || []);
      setRequests(rRes.requests || []);
      setInvitations(iRes.invitations || []);
    } catch {
      // Keep UI responsive on transient errors
    }
  }, []);

  const loadUserScopedData = useCallback(async () => {
    try {
      const [bRes, fRes, nRes, iRes, wRes] = await Promise.all([
        apiFetch<{ bookings: BookingRecord[] }>('/api/bookings'),
        apiFetch<{ favorites: FavoriteRecord[] }>('/api/favorites'),
        apiFetch<{ notifications: NotificationRecord[] }>('/api/notifications'),
        apiFetch<{ invitations: ElectronicInvitationRecord[] }>('/api/invitations'),
        apiFetch<{ workspace: CoupleWorkspaceRecord }>('/api/workspace').catch(() => null),
      ]);
      setBookings(bRes.bookings || []);
      setFavorites(fRes.favorites || []);
      setNotifications(nRes.notifications || []);
      setInvitations(iRes.invitations || []);
      if (wRes?.workspace) {
        setWorkspace(wRes.workspace);
      }
    } catch {
      // Ignored if logged out
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      setGuestInviteSlug(getInviteSlugFromUrl());
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    loadPublicCatalog();
    apiFetch<{ user: UserProfile | null }>('/api/auth/me')
      .then((res) => {
        if (res.user) {
          setUser(res.user);
          loadUserScopedData();
        }
      })
      .catch(() => {});
  }, [loadPublicCatalog, loadUserScopedData]);

  const dismissCinematicSplash = useCallback(() => {
    setShowCinematicSplash(false);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('velora_cinematic_seen', '1');
    }
  }, []);

  const navigate = (nextRoute: VeloraRoute) => {
    if (nextRoute !== 'auth') {
      setPreferredRegisterRole(null);
    } else if (!user) {
      setShowCinematicSplash(true);
    }
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAuthForRole = (role?: UserRole) => {
    setPreferredRegisterRole(role || null);
    if (!user) {
      setShowCinematicSplash(true);
    }
    setRoute('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openInternalInvitePreview = (slug: string) => {
    setInternalPreviewSlug(slug);
    window.scrollTo({ top: 0 });
  };

  const handleAuthSuccess = (authedUser: UserProfile, token: string) => {
    setClientAuthToken(token);
    setUser(authedUser);
    setPreferredRegisterRole(null);
    setShowCinematicSplash(false);
    loadUserScopedData();
    loadPublicCatalog();
    if (authedUser.role === 'admin') {
      navigate('admin');
    } else if (route === 'auth') {
      navigate('home');
    }
    setWelcomeUser(authedUser);
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    await signOutFirebase();
    setClientAuthToken(null);
    setUser(null);
    setBookings([]);
    setFavorites([]);
    setNotifications([]);
    setWorkspace(createDefaultCoupleWorkspace('guest'));
    loadPublicCatalog();
    navigate('home');
  };

  const handleSaveWorkspace = async (next: CoupleWorkspaceRecord) => {
    setWorkspace(next);
    if (!user) return;
    const res = await apiFetch<{ workspace: CoupleWorkspaceRecord }>('/api/workspace', {
      method: 'PUT',
      body: JSON.stringify(next),
    });
    if (res.workspace) {
      setWorkspace(res.workspace);
    }
  };

  const handleApplyMatchedPackage = async (input: FindWeddingInput, pkg: WeddingMatchPackage) => {
    const nextPrep = workspace.prepItems.map((item) => {
      if (item.category === 'venue' && pkg.venue) {
        return {
          ...item,
          vendorName: pkg.venue.titleAr,
          allocatedEgp: computeEffectivePrice(pkg.venue.pricePerEvent, pkg.venue.discountPercent),
          status: 'in_progress' as const,
        };
      }
      if (item.category === 'photographer' && pkg.photographer) {
        return {
          ...item,
          vendorName: pkg.photographer.displayName,
          allocatedEgp: computeEffectivePrice(pkg.photographer.startingPrice, pkg.photographer.discountPercent),
          status: 'in_progress' as const,
        };
      }
      const matchedSrv = pkg.services.find(
        (s) =>
          (item.category === 'kosha' && s.category === 'kosha') ||
          (item.category === 'decor' && (s.category === 'decor' || s.category === 'planning')) ||
          (item.category === 'flowers' && s.category === 'flowers') ||
          (item.category === 'catering' && s.category === 'catering') ||
          (item.category === 'music' && s.category === 'music')
      );
      if (matchedSrv) {
        return {
          ...item,
          vendorName: matchedSrv.titleAr,
          allocatedEgp: computeEffectivePrice(matchedSrv.startingPrice, matchedSrv.discountPercent),
          status: 'in_progress' as const,
        };
      }
      return item;
    });

    const nextWorkspace: CoupleWorkspaceRecord = {
      ...workspace,
      governorate: input.governorate,
      weddingDate: input.weddingDate,
      totalBudgetEgp: input.budgetEgp,
      guestsCount: input.guestsCount,
      dreamStyle: input.dreamStyle,
      prepItems: nextPrep,
      comparedIds: pkg.venue ? [pkg.venue.id] : workspace.comparedIds,
      updatedAt: new Date().toISOString(),
    };

    await handleSaveWorkspace(nextWorkspace);
    setWorkspaceInitialTab('budget');
    navigate('workspace');
  };

  const handleToggleFavorite = async (targetType: TargetEntityType, targetId: string) => {
    if (!user) {
      navigate('auth');
      return;
    }
    try {
      const res = await apiFetch<{ favorites: FavoriteRecord[] }>('/api/favorites/toggle', {
        method: 'POST',
        body: JSON.stringify({ targetType, targetId }),
      });
      setFavorites(res.favorites || []);
    } catch {
      // Ignored
    }
  };

  const handleMarkNotificationsRead = async (id?: string) => {
    try {
      const res = await apiFetch<{ notifications: NotificationRecord[] }>(
        '/api/notifications/read',
        { method: 'POST', body: JSON.stringify({ id }) }
      );
      setNotifications(res.notifications || []);
    } catch {
      // Ignored
    }
  };

  // CRITICAL: External guest ?invite=<slug> renders standalone envelope + card with ZERO back-to-site buttons
  if (guestInviteSlug) {
    return (
      <StandaloneInvitationView
        slug={guestInviteSlug}
        allowReturnToPreviewHost={false}
      />
    );
  }

  // Host preview opened from inside VÉLORA Studio / Home (allows closing preview back to host view)
  if (internalPreviewSlug) {
    return (
      <StandaloneInvitationView
        slug={internalPreviewSlug}
        allowReturnToPreviewHost={true}
        onExitPreview={() => {
          setInternalPreviewSlug(null);
          loadPublicCatalog();
          if (user) loadUserScopedData();
        }}
      />
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const routeKey = `${route}-${selectedVenueId}-${selectedPhotographerId}`;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#FAF7FD] text-[#24172E] relative">
        <FallingPetalsOverlay enabled={!showCinematicSplash} />

        <VeloraHeader
          route={route}
          onNavigate={navigate}
          user={user}
          unreadNotificationsCount={unreadCount}
          onOpenNotifications={() => setNotifOpen(true)}
        />
        <ScrollProgressRibbon />

        <main className="overflow-x-clip">
          <CinematicPageTransition routeKey={routeKey}>
        {route === 'home' && (
          <HomeView
            venues={venues}
            photographers={photographers}
            services={services}
            onNavigate={navigate}
            onSelectVenue={(id) => {
              setSelectedVenueId(id);
              navigate('venue_detail');
            }}
            onSelectPhotographer={(id) => {
              setSelectedPhotographerId(id);
              navigate('photographer_detail');
            }}
            onOpenSampleInvitation={() => openInternalInvitePreview(invitations[0]?.slug || 'adam-and-lina')}
          />
        )}

        {route === 'find_wedding' && (
          <FindWeddingView
            workspace={workspace}
            onSelectVenue={(id) => {
              setSelectedVenueId(id);
              navigate('venue_detail');
            }}
            onSelectPhotographer={(id) => {
              setSelectedPhotographerId(id);
              navigate('photographer_detail');
            }}
            onNavigateServices={() => navigate('services')}
            onApplyPackageToWorkspace={handleApplyMatchedPackage}
            onOpenWorkspaceCompare={(mode, ids) => {
              const nextWs: CoupleWorkspaceRecord = {
                ...workspace,
                compareMode: mode,
                comparedIds: ids.slice(0, 3),
              };
              handleSaveWorkspace(nextWs).catch(() => {});
              setWorkspaceInitialTab('compare');
              navigate('workspace');
            }}
          />
        )}

        {route === 'workspace' && (
          <CoupleWorkspaceView
            user={user}
            workspace={workspace}
            initialTab={workspaceInitialTab}
            bookings={bookings}
            venues={venues}
            photographers={photographers}
            services={services}
            onSaveWorkspace={handleSaveWorkspace}
            onSelectVenue={(id) => {
              setSelectedVenueId(id);
              navigate('venue_detail');
            }}
            onSelectPhotographer={(id) => {
              setSelectedPhotographerId(id);
              navigate('photographer_detail');
            }}
            onNavigateFindWedding={() => navigate('find_wedding')}
            onNavigateServices={() => navigate('services')}
            onNavigateBookings={() => navigate('bookings')}
            onRequireAuth={() => openAuthForRole('client')}
          />
        )}

        {route === 'venues' && (
          <VenuesView
            venues={venues}
            requests={requests.filter((r) => r.requestSection === 'venue')}
            favorites={favorites}
            user={user}
            onSelectVenue={(id) => {
              setSelectedVenueId(id);
              navigate('venue_detail');
            }}
            onToggleFavorite={(type, id) => handleToggleFavorite(type, id)}
            onRequestCreated={(req) => setRequests((prev) => [req, ...prev])}
            onVenueCreated={loadPublicCatalog}
            onRequireAuth={(role) => openAuthForRole(role)}
          />
        )}

        {route === 'venue_detail' && (
          <VenueDetailView
            venueId={selectedVenueId || venues[0]?.id || 'venue-orchid-palace'}
            user={user}
            isFavorite={favorites.some(
              (f) => f.targetType === 'venue' && f.targetId === selectedVenueId
            )}
            onToggleFavorite={() => handleToggleFavorite('venue', selectedVenueId)}
            onBack={() => navigate('venues')}
            onBooked={loadUserScopedData}
            onRequireAuth={() => openAuthForRole()}
          />
        )}

        {route === 'photographers' && (
          <PhotographersView
            photographers={photographers}
            requests={requests.filter((r) => r.requestSection === 'photographer')}
            favorites={favorites}
            user={user}
            onSelectPhotographer={(id) => {
              setSelectedPhotographerId(id);
              navigate('photographer_detail');
            }}
            onToggleFavorite={(type, id) => handleToggleFavorite(type, id)}
            onRequestCreated={(req) => setRequests((prev) => [req, ...prev])}
            onPhotographerCreated={loadPublicCatalog}
            onRequireAuth={(role) => openAuthForRole(role)}
          />
        )}

        {route === 'photographer_detail' && (
          <PhotographerDetailView
            photographerId={
              selectedPhotographerId || photographers[0]?.id || 'photo-karim-mansour'
            }
            user={user}
            isFavorite={favorites.some(
              (f) => f.targetType === 'photographer' && f.targetId === selectedPhotographerId
            )}
            onToggleFavorite={() => handleToggleFavorite('photographer', selectedPhotographerId)}
            onBack={() => navigate('photographers')}
            onBooked={loadUserScopedData}
            onRequireAuth={() => openAuthForRole()}
          />
        )}

        {route === 'services' && (
          <ServicesView
            services={services}
            requests={requests.filter((r) => r.requestSection === 'service')}
            favorites={favorites}
            user={user}
            onToggleFavorite={(type, id) => handleToggleFavorite(type, id)}
            onRequestCreated={(req) => setRequests((prev) => [req, ...prev])}
            onServiceCreated={loadPublicCatalog}
            onBooked={loadUserScopedData}
            onRequireAuth={(role) => openAuthForRole(role)}
          />
        )}

        {route === 'invitations' && (
          <InvitationsView
            invitations={invitations}
            user={user}
            onInvitationCreated={(inv) => setInvitations((prev) => [inv, ...prev])}
            onInvitationDeleted={(id) =>
              setInvitations((prev) => prev.filter((item) => item.id !== id))
            }
            onOpenGuestLink={openInternalInvitePreview}
            onRequireAuth={() => openAuthForRole()}
          />
        )}

        {route === 'bookings' && (
          <BookingsView
            bookings={bookings}
            user={user}
            onRefreshBookings={loadUserScopedData}
            onRequireAuth={() => openAuthForRole()}
          />
        )}

        {route === 'packages' && (
          <PackagesView
            user={user}
            onRequireAuth={(role) => openAuthForRole(role)}
          />
        )}

        {(route === 'auth' || route === 'profile') && (
          <AuthAndProfileView
            mode={route}
            user={user}
            initialRegisterRole={preferredRegisterRole}
            favorites={favorites}
            venues={venues}
            photographers={photographers}
            services={services}
            onAuthSuccess={handleAuthSuccess}
            onUserUpdated={(updated) => setUser(updated)}
            onLogout={handleLogout}
            onOpenAdmin={() => navigate('admin')}
            onProviderSubmissionDone={() => {
              loadPublicCatalog();
              loadUserScopedData();
            }}
            onOpenVenue={(id) => {
              setSelectedVenueId(id);
              navigate('venue_detail');
            }}
            onOpenPhotographer={(id) => {
              setSelectedPhotographerId(id);
              navigate('photographer_detail');
            }}
            onReplayCinematic={() => setShowCinematicSplash(true)}
          />
        )}

        {route === 'admin' && (
          <AdminDashboardView
            user={user}
            onAuthSuccess={handleAuthSuccess}
            onDataChanged={() => {
              loadPublicCatalog();
              loadUserScopedData();
            }}
          />
        )}

          {route === 'not_found' && <NotFoundView onGoHome={() => navigate('home')} />}
          </CinematicPageTransition>
        </main>

        <NotificationsDrawer
          open={notifOpen}
          notifications={notifications}
          onClose={() => setNotifOpen(false)}
          onMarkRead={handleMarkNotificationsRead}
        />

        {showCinematicSplash && (
          <VeloraCinematicSplash onComplete={dismissCinematicSplash} />
        )}

        {welcomeUser && (
          <VeloraWelcomeModal
            user={welcomeUser}
            onClose={() => setWelcomeUser(null)}
            onNavigate={navigate}
          />
        )}

        <OfflineIndicator />
      </div>
    </MotionConfig>
  );
}
