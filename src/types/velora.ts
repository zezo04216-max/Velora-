export type UserRole =
  | 'guest'
  | 'client'
  | 'venue_owner'
  | 'photographer'
  | 'service_provider'
  | 'admin';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type BookingStatus =
  | 'pending'
  | 'provider_approved'
  | 'admin_approved'
  | 'confirmed'
  | 'rejected'
  | 'cancelled';

export type TargetEntityType = 'venue' | 'photographer' | 'service';

export type ServiceCategoryKey =
  | 'decor'
  | 'planning'
  | 'flowers'
  | 'kosha'
  | 'dresses'
  | 'makeup'
  | 'hair'
  | 'cars'
  | 'music'
  | 'catering'
  | 'other';

export type InvitationDesignId =
  | 'royal'
  | 'luxury'
  | 'romantic'
  | 'classic'
  | 'modern'
  | 'floral'
  | 'minimal';

export type RsvpResponseStatus = 'attending' | 'declined';

export type MembershipFrameTier = 'none' | 'starter' | 'royal' | 'platinum' | 'vip_couple';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'suspended';
  avatarUrl: string;
  city: string;
  bio: string;
  verified?: boolean;
  membershipTier?: MembershipFrameTier;
  membershipLabelAr?: string;
  createdAt: string;
}

export interface VenueRecord {
  id: string;
  ownerId: string;
  ownerName: string;
  titleAr: string;
  subtitleAr: string;
  city: string;
  area: string;
  address: string;
  mapUrl: string;
  capacityMin: number;
  capacityMax: number;
  pricePerEvent: number;
  discountPercent: number;
  workingHours: string;
  decorStyles: string[];
  features: string[];
  descriptionAr: string;
  coverImage: string;
  galleryImages: string[];
  videoUrl: string;
  /** Optional public phone typed by the provider at publish time. */
  contactPhone?: string;
  /** Fictional demo listing; remove with scripts/demo_listings.py delete. */
  isDemo?: boolean;
  status: ApprovalStatus;
  featured: boolean;
  avgRating: number;
  reviewsCount: number;
  verified?: boolean;
  membershipTier?: MembershipFrameTier;
  membershipLabelAr?: string;
  createdAt: string;
}

export interface PhotographerAlbum {
  id: string;
  photographerId: string;
  titleAr: string;
  descriptionAr: string;
  sessionDate: string;
  locationAr: string;
  photos: string[];
}

export interface PhotographerRecord {
  id: string;
  ownerId: string;
  displayName: string;
  specialtyAr: string;
  city: string;
  studioLocation: string;
  yearsExperience: number;
  workingHours: string;
  startingPrice: number;
  discountPercent: number;
  bioAr: string;
  equipmentAr: string;
  shootingTypes: string[];
  avatarUrl: string;
  coverImage: string;
  videoReelUrl: string;
  albums: PhotographerAlbum[];
  /** Optional public phone typed by the provider at publish time. */
  contactPhone?: string;
  /** Fictional demo listing; remove with scripts/demo_listings.py delete. */
  isDemo?: boolean;
  status: ApprovalStatus;
  featured: boolean;
  avgRating: number;
  reviewsCount: number;
  verified?: boolean;
  membershipTier?: MembershipFrameTier;
  membershipLabelAr?: string;
  createdAt: string;
}

export interface ServiceRecord {
  id: string;
  ownerId: string;
  providerName: string;
  category: ServiceCategoryKey;
  titleAr: string;
  city: string;
  area: string;
  startingPrice: number;
  discountPercent: number;
  workingHours: string;
  descriptionAr: string;
  packagesAr: string[];
  coverImage: string;
  galleryImages: string[];
  videoUrl: string;
  /** Optional public phone typed by the provider at publish time. */
  contactPhone?: string;
  /** Fictional demo listing; remove with scripts/demo_listings.py delete. */
  isDemo?: boolean;
  status: ApprovalStatus;
  featured: boolean;
  avgRating: number;
  reviewsCount: number;
  verified?: boolean;
  membershipTier?: MembershipFrameTier;
  membershipLabelAr?: string;
  createdAt: string;
}

export interface CustomerRequestRecord {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  requestSection: TargetEntityType;
  serviceCategory?: ServiceCategoryKey;
  titleAr: string;
  eventDate: string;
  city: string;
  area: string;
  guestsCount: number;
  budgetEgp: number;
  preferredType: string;
  requestedServices: string[];
  notesAr: string;
  status: 'open' | 'matched' | 'closed';
  createdAt: string;
}

export interface RequestReplyRecord {
  id: string; // = provider uid (one reply per provider per request)
  requestId: string;
  clientId: string;
  providerId: string;
  providerName: string;
  providerRole: string;
  serviceId?: string;
  serviceTitle?: string;
  priceEgp: number;
  noteAr: string;
  providerPhone?: string; // only present when the provider opted in
  status: 'sent' | 'accepted' | 'ignored';
  createdAt: string;
  updatedAt?: string;
}

export interface BookingRecord {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  providerOwnerId: string;
  targetType: TargetEntityType;
  targetId: string;
  targetTitle: string;
  targetImage: string;
  eventDate: string;
  guestsCount: number;
  estimatedTotalEgp: number;
  paymentMode: 'offline_agreement' | 'deposit_ready';
  notes: string;
  providerApproved: boolean;
  adminApproved: boolean;
  status: BookingStatus;
  providerNote: string;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRecord {
  id: string;
  authorId: string;
  authorName: string;
  targetType: TargetEntityType;
  targetId: string;
  targetTitle?: string;
  rating: number;
  commentAr: string;
  status: ApprovalStatus;
  createdAt: string;
}

export interface FavoriteRecord {
  id: string;
  userId: string;
  targetType: TargetEntityType;
  targetId: string;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  titleAr: string;
  bodyAr: string;
  kind: 'booking' | 'approval' | 'review' | 'system';
  relatedRoute?: string;
  isRead: boolean;
  createdAt: string;
}

export interface InvitationRsvpRecord {
  id: string;
  invitationId: string;
  guestName: string;
  guestPhone: string;
  response: RsvpResponseStatus;
  companionsCount: number;
  congratulationMessage: string;
  createdAt: string;
}

export interface InvitationStats {
  totalGuests: number;
  attendingCount: number;
  declinedCount: number;
  messagesCount: number;
}

export interface ElectronicInvitationRecord {
  id: string;
  ownerId: string;
  slug: string;
  designId: InvitationDesignId;
  designPriceEgp?: number;
  /** free: no charge; pending: paid card waiting for the admin to confirm payment; paid: activated. */
  paymentStatus?: 'free' | 'pending' | 'paid';
  groomName: string;
  brideName: string;
  weddingDate: string;
  weddingTime: string;
  venueName: string;
  mapUrl: string;
  invitationText: string;
  couplePhoto: string;
  contactPhone: string;
  createdAt: string;
  stats?: InvitationStats;
}

export interface AdminAuditLogRecord {
  id: string;
  adminId: string;
  adminName: string;
  actionAr: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

export interface InvitationDesignSpec {
  id: InvitationDesignId;
  labelAr: string;
  taglineAr: string;
  tier: 'free' | 'paid';
  priceEgp: number;
  cardBg: string;
  cardBorder: string;
  accentColor: string;
  headingColor: string;
  bodyColor: string;
  badgeBg: string;
  badgeText: string;
  countdownBg: string;
  frameStyle: 'double_royal' | 'velvet_edge' | 'silk_halo' | 'classic_arch' | 'modern_split' | 'botanical_crest' | 'minimal_gallery';
  bgImage?: string;
}

export type WhatsAppMilestone = '3d' | '1d' | '6h';
export type WhatsAppProviderKind = 'meta' | 'twilio' | 'ultramsg' | 'simulation';
export type WhatsAppReminderStatus = 'sent' | 'simulated' | 'failed';

export interface WhatsAppReminderRecord {
  id: string;
  bookingId: string;
  milestone: WhatsAppMilestone;
  recipientPhone: string;
  clientName: string;
  targetTitle: string;
  eventDate: string;
  eventTime: string;
  messageBody: string;
  provider: WhatsAppProviderKind;
  status: WhatsAppReminderStatus;
  providerMessageId: string;
  errorText: string;
  sentAt: string;
  createdAt: string;
}

export interface UpcomingReminderMilestoneState {
  milestone: WhatsAppMilestone;
  labelAr: string;
  scheduledAtIso: string;
  state: 'sent' | 'simulated' | 'failed' | 'due_now' | 'upcoming' | 'missed_past';
  sentAt?: string;
}

export interface UpcomingReminderPreview {
  bookingId: string;
  clientName: string;
  clientPhone: string;
  normalizedPhone: string | null;
  targetTitle: string;
  eventDate: string;
  eventTime: string;
  eventAtIso: string;
  hoursUntilEvent: number;
  milestones: UpcomingReminderMilestoneState[];
}

export interface WhatsAppConfigSummary {
  provider: WhatsAppProviderKind;
  configured: boolean;
  cronProtected: boolean;
  providerLabelAr: string;
}

export type WeddingDreamStyle =
  | 'royal_palace'
  | 'nile_garden'
  | 'modern_chic'
  | 'intimate_boutique'
  | 'classic_heritage';

export type CoupleChecklistCategory =
  | 'venue'
  | 'photographer'
  | 'decor'
  | 'kosha'
  | 'dress'
  | 'suit'
  | 'makeup_hair'
  | 'flowers'
  | 'music'
  | 'catering'
  | 'invitations'
  | 'other';

export interface CouplePrepItem {
  id: string;
  category: CoupleChecklistCategory;
  labelAr: string;
  vendorName: string;
  allocatedEgp: number;
  paidEgp: number;
  status: 'pending' | 'in_progress' | 'booked' | 'done';
  notes: string;
}

export interface CoupleTaskItem {
  id: string;
  titleAr: string;
  horizonAr: string;
  done: boolean;
  dueDate: string;
}

export interface CoupleAgreementItem {
  id: string;
  titleAr: string;
  vendorName: string;
  date: string;
  time: string;
  location: string;
  status: 'scheduled' | 'completed';
}

export interface CoupleWorkspaceRecord {
  userId: string;
  coupleTitle: string;
  governorate: string;
  weddingDate: string;
  guestsCount: number;
  totalBudgetEgp: number;
  dreamStyle: WeddingDreamStyle;
  prepItems: CouplePrepItem[];
  tasks: CoupleTaskItem[];
  agreements: CoupleAgreementItem[];
  compareMode: 'venue' | 'photographer';
  comparedIds: string[];
  updatedAt: string;
}

export interface FindWeddingInput {
  governorate: string;
  weddingDate: string;
  budgetEgp: number;
  guestsCount: number;
  dreamStyle: WeddingDreamStyle;
}

export interface WeddingMatchPackage {
  tier: 'ideal' | 'smart_value' | 'luxury_fit';
  tierLabelAr: string;
  matchSummaryAr: string;
  venue: VenueRecord | null;
  photographer: PhotographerRecord | null;
  services: ServiceRecord[];
  estimatedTotalEgp: number;
  remainingBudgetEgp: number;
  withinBudget: boolean;
  reasonsAr: string[];
}

export type SubscriptionAudience = 'provider' | 'client';
export type SubscriptionBillingCycle = 'monthly' | 'quarterly' | 'annual' | 'one_time';
export type SubscriptionRequestStatus = 'pending' | 'active' | 'rejected' | 'cancelled';

export interface SubscriptionPlanRecord {
  id: string;
  audience: SubscriptionAudience;
  targetRolesAr: string;
  nameAr: string;
  taglineAr: string;
  monthlyPriceEgp: number;
  quarterlyPriceEgp: number;
  annualPriceEgp: number;
  billingNoteAr: string;
  features: string[];
  highlighted: boolean;
  active: boolean;
  sortOrder: number;
}

export interface UserSubscriptionRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  planId: string;
  planNameAr: string;
  audience: SubscriptionAudience;
  billingCycle: SubscriptionBillingCycle;
  amountEgp: number;
  contactPhone: string;
  businessOrCoupleName: string;
  paymentMethod: string;
  paymentReceiptUrl: string;
  notes: string;
  status: SubscriptionRequestStatus;
  adminNote: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
}



