import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { AuthLayout } from './components/layout/AuthLayout'

const Loader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      <p className="text-xs text-ink-500">加载中…</p>
    </div>
  </div>
)

const withSuspense = (el: React.ReactNode) => <Suspense fallback={<Loader />}>{el}</Suspense>

const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })))
const NewsListPage = lazy(() => import('./pages/NewsListPage').then(m => ({ default: m.NewsListPage })))
const NewsDetailPage = lazy(() => import('./pages/NewsDetailPage').then(m => ({ default: m.NewsDetailPage })))
const DebatesListPage = lazy(() => import('./pages/DebatesListPage').then(m => ({ default: m.DebatesListPage })))
const DebateDetailPage = lazy(() => import('./pages/DebateDetailPage').then(m => ({ default: m.DebateDetailPage })))
const ShopListPage = lazy(() => import('./pages/ShopListPage').then(m => ({ default: m.ShopListPage })))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })))
const ShopHomePage = lazy(() => import('./pages/ShopHomePage').then(m => ({ default: m.ShopHomePage })))
const ProductDetailV2 = lazy(() => import('./pages/ProductDetailV2').then(m => ({ default: m.ProductDetailV2 })))
const BrandPage = lazy(() => import('./pages/BrandPage').then(m => ({ default: m.BrandPage })))
const BrandStreetPage = lazy(() => import('./pages/BrandStreetPage').then(m => ({ default: m.BrandStreetPage })))
const CouponsPage = lazy(() => import('./pages/CouponsPage').then(m => ({ default: m.CouponsPage })))
const LiveShoppingPage = lazy(() => import('./pages/LiveShoppingPage').then(m => ({ default: m.LiveShoppingPage })))
const ComparePage = lazy(() => import('./pages/ComparePage').then(m => ({ default: m.ComparePage })))
const ShortVideoPage = lazy(() => import('./pages/ShortVideoPage'))
const ShortVideoDetailPage = lazy(() => import('./pages/ShortVideoDetailPage'))
const ShortVideoCreatorPage = lazy(() => import('./pages/ShortVideoCreatorPage'))
const SupportPage = lazy(() => import('./pages/SupportPage'))
const MemberPage = lazy(() => import('./pages/MemberPage'))
const NotificationsHubPage = lazy(() => import('./pages/NotificationsHubPage'))
const BundlesPage = lazy(() => import('./pages/BundlesPage'))
const CuratorPage = lazy(() => import('./pages/CuratorPage'))
const AddressBookPage = lazy(() => import('./pages/AddressBookPage'))
const FlashSalePage = lazy(() => import('./pages/FlashSalePage'))
const ForYouPage = lazy(() => import('./pages/ForYouPage').then(m => ({ default: m.ForYouPage })))
const CampaignPage = lazy(() => import('./pages/CampaignPage').then(m => ({ default: m.CampaignPage })))
const SignInCalendarPage = lazy(() => import('./pages/SignInCalendarPage').then(m => ({ default: m.SignInCalendarPage })))
const ShopFilterPage = lazy(() => import('./pages/ShopFilterPage').then(m => ({ default: m.ShopFilterPage })))
const DebateHomePage = lazy(() => import('./pages/DebateHomePage').then(m => ({ default: m.DebateHomePage })))
const DebateDetailV2 = lazy(() => import('./pages/DebateDetailV2').then(m => ({ default: m.DebateDetailV2 })))
const RoundTablePage = lazy(() => import('./pages/RoundTablePage').then(m => ({ default: m.RoundTablePage })))
const CartPage = lazy(() => import('./pages/CartPage').then(m => ({ default: m.CartPage })))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })))
const CheckoutSuccessPage = lazy(() => import('./pages/CheckoutSuccessPage').then(m => ({ default: m.CheckoutSuccessPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const WishlistPage = lazy(() => import('./pages/WishlistPage').then(m => ({ default: m.WishlistPage })))
const OrdersPage = lazy(() => import('./pages/OrdersPage').then(m => ({ default: m.OrdersPage })))
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })))
const AfterSalesPage = lazy(() => import('./pages/AfterSalesPage').then(m => ({ default: m.AfterSalesPage })))
const ReviewPage = lazy(() => import('./pages/ReviewPage').then(m => ({ default: m.ReviewPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))

const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })))
const FeedPage = lazy(() => import('./pages/FeedPage').then(m => ({ default: m.FeedPage })))
const PostDetailPage = lazy(() => import('./pages/PostDetailPage').then(m => ({ default: m.PostDetailPage })))
const ComposePage = lazy(() => import('./pages/ComposePage').then(m => ({ default: m.ComposePage })))
const UserProfilePage = lazy(() => import('./pages/UserProfilePage').then(m => ({ default: m.UserProfilePage })))
const CreatorProfilePage = lazy(() => import('./pages/CreatorProfilePage').then(m => ({ default: m.CreatorProfilePage })))
const MessagesPage = lazy(() => import('./pages/MessagesPage').then(m => ({ default: m.MessagesPage })))
const ChatPage = lazy(() => import('./pages/ChatPage').then(m => ({ default: m.ChatPage })))
const GroupsPage = lazy(() => import('./pages/GroupsPage').then(m => ({ default: m.GroupsPage })))
const GroupDetailPage = lazy(() => import('./pages/GroupDetailPage').then(m => ({ default: m.GroupDetailPage })))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })))
const SearchPage = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })))
const GlobalSearchPage = lazy(() => import('./pages/GlobalSearchPage').then(m => ({ default: m.GlobalSearchPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const AdminLayout = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminLayout })))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminModerationPage = lazy(() => import('./pages/AdminModerationPage').then(m => ({ default: m.AdminModerationPage })))
const AdminStatsPage = lazy(() => import('./pages/AdminStatsPage').then(m => ({ default: m.AdminStatsPage })))
const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPage').then(m => ({ default: m.AdminAnalyticsPage })))
const ReviewsPage = lazy(() => import('./pages/ReviewsPage').then(m => ({ default: m.ReviewsPage })))
const LiveSchedulePage = lazy(() => import('./pages/LiveSchedulePage').then(m => ({ default: m.LiveSchedulePage })))
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage').then(m => ({ default: m.HelpCenterPage })))
const ProductQAPage = lazy(() => import('./pages/ProductQAPage').then(m => ({ default: m.ProductQAPage })))
const OrderTrackingPage = lazy(() => import('./pages/OrderTrackingPage').then(m => ({ default: m.OrderTrackingPage })))
const AchievementsPage = lazy(() => import('./pages/AchievementsPage').then(m => ({ default: m.AchievementsPage })))
const InsightsPage = lazy(() => import('./pages/InsightsPage').then(m => ({ default: m.InsightsPage })))
const CreatorCenterPage = lazy(() => import('./pages/CreatorCenterPage').then(m => ({ default: m.CreatorCenterPage })))
const ActivityDetailPage = lazy(() => import('./pages/ActivityDetailPage').then(m => ({ default: m.ActivityDetailPage })))
const InvitePage = lazy(() => import('./pages/InvitePage').then(m => ({ default: m.InvitePage })))
const LiveChatPage = lazy(() => import('./pages/LiveChatPage').then(m => ({ default: m.LiveChatPage })))
const SmartWishlistPage = lazy(() => import('./pages/WishlistDetailPage').then(m => ({ default: m.SmartWishlistPage })))
const ServerErrorPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.ServerErrorPage })))
const MaintenancePage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.MaintenancePage })))
const OfflinePage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.OfflinePage })))
const AISearchPage = lazy(() => import('./pages/AISearchPage').then(m => ({ default: m.AISearchPage })))
const SmartListPage = lazy(() => import('./pages/SmartListPage').then(m => ({ default: m.SmartListPage })))
const NotesPage = lazy(() => import('./pages/NotesPage').then(m => ({ default: m.NotesPage })))
const LiveReplayPage = lazy(() => import('./pages/LiveReplayPage').then(m => ({ default: m.LiveReplayPage })))
const QuickNotesPage = lazy(() => import('./pages/QuickNotesPage').then(m => ({ default: m.QuickNotesPage })))
const CalendarPage = lazy(() => import('./pages/CalendarPage').then(m => ({ default: m.CalendarPage })))
const LiveSubsPage = lazy(() => import('./pages/LiveSubsPage').then(m => ({ default: m.LiveSubsPage })))
const ThemeBuilderPage = lazy(() => import('./pages/ThemeBuilderPage').then(m => ({ default: m.ThemeBuilderPage })))
const UserDashboardPage = lazy(() => import('./pages/UserDashboardPage').then(m => ({ default: m.UserDashboardPage })))
const MyContentPage = lazy(() => import('./pages/MyContentPage').then(m => ({ default: m.MyContentPage })))
const TagCloudPage = lazy(() => import('./pages/TagCloudPage').then(m => ({ default: m.TagCloudPage })))
const UserSearchPage = lazy(() => import('./pages/UserSearchPage').then(m => ({ default: m.UserSearchPage })))
const WishlistFoldersPage = lazy(() => import('./pages/WishlistFoldersPage').then(m => ({ default: m.WishlistFoldersPage })))
const CouponCenterPage = lazy(() => import('./pages/CouponCenterPage').then(m => ({ default: m.CouponCenterPage })))
const PollPage = lazy(() => import('./pages/PollPage').then(m => ({ default: m.PollPage })))
const LiveCalendarPage = lazy(() => import('./pages/LiveCalendarPage').then(m => ({ default: m.LiveCalendarPage })))
const PurchaseHistoryPage = lazy(() => import('./pages/PurchaseHistoryPage').then(m => ({ default: m.PurchaseHistoryPage })))
const ForumPage = lazy(() => import('./pages/ForumPage').then(m => ({ default: m.ForumPage })))
const InboxPageRoute = lazy(() => import('./pages/InboxPageRoute').then(m => ({ default: m.InboxPageRoute })))
const AIWriterPage = lazy(() => import('./pages/AIWriterPage').then(m => ({ default: m.AIWriterPage })))
const OrderTrackerPage = lazy(() => import('./pages/OrderTrackerPage').then(m => ({ default: m.OrderTrackerPage })))
const ProductComparePage = lazy(() => import('./pages/ProductComparePage').then(m => ({ default: m.ProductComparePage })))
const CreatorStudioPage = lazy(() => import('./pages/CreatorStudioPage').then(m => ({ default: m.CreatorStudioPage })))
const GiftLeaderboardPage = lazy(() => import('./pages/GiftLeaderboardPage').then(m => ({ default: m.GiftLeaderboardPage })))
const RedPacketPage = lazy(() => import('./pages/RedPacketPage').then(m => ({ default: m.RedPacketPage })))
const GroupBuyPage = lazy(() => import('./pages/GroupBuyPage').then(m => ({ default: m.GroupBuyPage })))
const DebateLeaderboardPage = lazy(() => import('./pages/DebateLeaderboardPage').then(m => ({ default: m.DebateLeaderboardPage })))
const ProductQAV2Page = lazy(() => import('./pages/ProductQAV2Page').then(m => ({ default: m.ProductQAV2Page })))
const LivePKPage = lazy(() => import('./pages/LivePKPage').then(m => ({ default: m.LivePKPage })))
const CreatorAcademyPage = lazy(() => import('./pages/CreatorAcademyPage').then(m => ({ default: m.CreatorAcademyPage })))
const LiveShopWindowPage = lazy(() => import('./pages/LiveShopWindowPage').then(m => ({ default: m.LiveShopWindowPage })))
const Product3DPage = lazy(() => import('./pages/Product3DPage').then(m => ({ default: m.Product3DPage })))
const ReplayEditorPage = lazy(() => import('./pages/ReplayEditorPage').then(m => ({ default: m.ReplayEditorPage })))
const MerchantOnboardingPage = lazy(() => import('./pages/MerchantOnboardingPage').then(m => ({ default: m.MerchantOnboardingPage })))
const InviteV2Page = lazy(() => import('./pages/InviteV2Page').then(m => ({ default: m.InviteV2Page })))
const VideoCommentsPage = lazy(() => import('./pages/VideoCommentsPage').then(m => ({ default: m.VideoCommentsPage })))
const DanmakuSentimentPage = lazy(() => import('./pages/DanmakuSentimentPage').then(m => ({ default: m.DanmakuSentimentPage })))
const RevenueCalendarPage = lazy(() => import('./pages/RevenueCalendarPage').then(m => ({ default: m.RevenueCalendarPage })))
const CartSuggestionsPage = lazy(() => import('./pages/CartSuggestionsPage').then(m => ({ default: m.CartSuggestionsPage })))
const PrivacySettingsPage = lazy(() => import('./pages/PrivacySettingsPage').then(m => ({ default: m.PrivacySettingsPage })))
const UserJourneyPage = lazy(() => import('./pages/UserJourneyPage').then(m => ({ default: m.UserJourneyPage })))
const ProductGalleryPage = lazy(() => import('./pages/ProductGalleryPage').then(m => ({ default: m.ProductGalleryPage })))
const BrandStoryPage = lazy(() => import('./pages/BrandStoryPage').then(m => ({ default: m.BrandStoryPage })))
const SocialToolsPage = lazy(() => import('./pages/SocialTools').then(m => ({ default: m.SocialTools })))
const PersonalHubPage = lazy(() => import('./pages/PersonalHub').then(m => ({ default: m.PersonalHub })))
const CreatorHubPage = lazy(() => import('./pages/CreatorHub').then(m => ({ default: m.CreatorHub })))
const LifeHubPage = lazy(() => import('./pages/LifeHub').then(m => ({ default: m.LifeHub })))
const ExploreHubPage = lazy(() => import('./pages/ExploreHub').then(m => ({ default: m.ExploreHub })))
const InsightsHubPage = lazy(() => import('./pages/InsightsHub').then(m => ({ default: m.InsightsHub })))
const CreateHubPage = lazy(() => import('./pages/CreateHub').then(m => ({ default: m.CreateHub })))
const DevHubPage = lazy(() => import('./pages/DevHub').then(m => ({ default: m.DevHub })))
const FunHubPage = lazy(() => import('./pages/FunHub').then(m => ({ default: m.FunHub })))
const LifeHub2Page = lazy(() => import('./pages/LifeHub2').then(m => ({ default: m.LifeHub2 })))
const FinanceHubPage = lazy(() => import('./pages/FinanceHub').then(m => ({ default: m.FinanceHub })))
const HealthHubPage = lazy(() => import('./pages/HealthHub').then(m => ({ default: m.HealthHub })))
const TravelHubPage = lazy(() => import('./pages/TravelHub').then(m => ({ default: m.TravelHub })))
const InvestHubPage = lazy(() => import('./pages/InvestHub').then(m => ({ default: m.InvestHub })))
const LearnHubPage = lazy(() => import('./pages/LearnHub').then(m => ({ default: m.LearnHub })))
const FoodHubPage = lazy(() => import('./pages/FoodHub').then(m => ({ default: m.FoodHub })))
const MusicHubPage = lazy(() => import('./pages/MusicHub').then(m => ({ default: m.MusicHub })))
const FamilyHubPage = lazy(() => import('./pages/FamilyHub').then(m => ({ default: m.FamilyHub })))
const PetHubPage = lazy(() => import('./pages/PetHub').then(m => ({ default: m.PetHub })))
const AIHubPage = lazy(() => import('./pages/AIHub').then(m => ({ default: m.AIHub })))
const PhotographyHubPage = lazy(() => import('./pages/PhotographyHub').then(m => ({ default: m.PhotographyHub })))
const MathHubPage = lazy(() => import('./pages/MathHub').then(m => ({ default: m.MathHub })))
const CarHubPage = lazy(() => import('./pages/CarHub').then(m => ({ default: m.CarHub })))
const AstrologyHubPage = lazy(() => import('./pages/AstrologyHub').then(m => ({ default: m.AstrologyHub })))
const GardeningHubPage = lazy(() => import('./pages/GardeningHub').then(m => ({ default: m.GardeningHub })))
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage').then(m => ({ default: m.AIAssistantPage })))
const PerformancePage = lazy(() => import('./pages/PerformancePage').then(m => ({ default: m.PerformancePage })))
const CreatorDashboardPage = lazy(() => import('./pages/CreatorDashboardPage').then(m => ({ default: m.CreatorDashboardPage })))
const SearchResultsPage = lazy(() => import('./search/components').then(m => ({ default: m.SearchResultsPage })))
const AnalyticsDashboard = lazy(() => import('./observability/components').then(m => ({ default: m.AnalyticsDashboard })))
const AdminDashboard = lazy(() => import('./admin/components').then(m => ({ default: m.AdminDashboard })))
const DesignSystemPage = lazy(() => import('./design-system/page').then(m => ({ default: m.DesignSystemPage })))
const RealtimePage = lazy(() => import('./realtime/page').then(m => ({ default: m.RealtimePage })))
const MLPipelinePage = lazy(() => import('./ml/page').then(m => ({ default: m.MLPipelinePage })))
const PluginsPage = lazy(() => import('./plugins/page').then(m => ({ default: m.PluginsPage })))
const GraphQLPage = lazy(() => import('./graphql/page').then(m => ({ default: m.GraphQLPage })))
const VectorPage = lazy(() => import('./vector/page').then(m => ({ default: m.VectorPage })))
const EdgePage = lazy(() => import('./edge/page').then(m => ({ default: m.EdgePage })))
const FederationPage = lazy(() => import('./federation/page').then(m => ({ default: m.FederationPage })))
const WorkflowPage = lazy(() => import('./workflow/page').then(m => ({ default: m.WorkflowPage })))
const TenantPage = lazy(() => import('./tenant/page').then(m => ({ default: m.TenantPage })))
const PrivacyPage = lazy(() => import('./privacy/page').then(m => ({ default: m.PrivacyPage })))
const NotifPage = lazy(() => import('./notif/page'))
const QueuePage = lazy(() => import('./queue/page'))
const SecretsPage = lazy(() => import('./secrets/page'))
const GatewayPage = lazy(() => import('./gateway/page'))
const FeatflagPage = lazy(() => import('./featflag/page'))
const DistlockPage = lazy(() => import('./distlock/page'))
const FilestorePage = lazy(() => import('./filestore/page'))

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Layout />,
      children: [
        { index: true, element: withSuspense(<HomePage />) },
        { path: 'feed', element: withSuspense(<FeedPage />) },
        { path: 'explore', element: withSuspense(<FeedPage />) },
        { path: 'search', element: withSuspense(<SearchPage />) },
        { path: 'discover', element: withSuspense(<GlobalSearchPage />) },
        { path: 'notifications', element: withSuspense(<NotificationsPage />) },
        { path: 'messages', element: withSuspense(<NotificationsHubPage />) },
        { path: 'messages/:id', element: withSuspense(<ChatPage />) },
        { path: 'compose', element: withSuspense(<ComposePage />) },
        { path: 'groups', element: withSuspense(<GroupsPage />) },
        { path: 'groups/:id', element: withSuspense(<GroupDetailPage />) },

        { path: 'news', element: withSuspense(<NewsListPage />) },
        { path: 'news/:id', element: withSuspense(<NewsDetailPage />) },
        { path: 'debates', element: withSuspense(<DebateHomePage />) },
        { path: 'debates/roundtable/:id', element: withSuspense(<RoundTablePage />) },
        { path: 'debates/:id', element: withSuspense(<DebateDetailV2 />) },
        { path: 'debates-legacy', element: withSuspense(<DebatesListPage />) },
        { path: 'debates-legacy/:id', element: withSuspense(<DebateDetailPage />) },
        { path: 'shop', element: withSuspense(<ShopHomePage />) },
        { path: 'shop/brand/:id', element: withSuspense(<BrandPage />) },
        { path: 'shop/brands', element: withSuspense(<BrandStreetPage />) },
        { path: 'shop/coupons', element: withSuspense(<CouponsPage />) },
        { path: 'shop/compare', element: withSuspense(<ComparePage />) },
        { path: 'reviews', element: withSuspense(<ReviewsPage />) },
        { path: 'reviews/:productId', element: withSuspense(<ReviewsPage />) },
        { path: 'shop/live', element: withSuspense(<LiveShoppingPage />) },
        { path: 'shop/live/:id', element: withSuspense(<LiveShoppingPage />) },
        { path: 'shop/live/replay', element: withSuspense(<LiveReplayPage />) },
        { path: 'shop/live/replay/:id', element: withSuspense(<LiveReplayPage />) },
        { path: 'shop/live-schedule', element: withSuspense(<LiveSchedulePage />) },
        { path: 'help', element: withSuspense(<HelpCenterPage />) },
        { path: 'qa', element: withSuspense(<ProductQAPage />) },
        { path: 'qa/:productId', element: withSuspense(<ProductQAPage />) },
        { path: 'tracking/:orderId', element: withSuspense(<OrderTrackingPage />) },
        { path: 'achievements', element: withSuspense(<AchievementsPage />) },
        { path: 'insights', element: withSuspense(<InsightsPage />) },
        { path: 'creator-center', element: withSuspense(<CreatorCenterPage />) },
        { path: 'activity', element: withSuspense(<ActivityDetailPage />) },
        { path: 'activity/:id', element: withSuspense(<ActivityDetailPage />) },
        { path: 'invite', element: withSuspense(<InvitePage />) },
        { path: 'support/chat', element: withSuspense(<LiveChatPage />) },
        { path: 'wishlist/collections', element: withSuspense(<SmartWishlistPage />) },
        { path: 'demo/500', element: withSuspense(<ServerErrorPage />) },
        { path: 'demo/maintenance', element: withSuspense(<MaintenancePage />) },
        { path: 'demo/offline', element: withSuspense(<OfflinePage />) },
        { path: 'discover/ai', element: withSuspense(<AISearchPage />) },
        { path: 'smartlist', element: withSuspense(<SmartListPage />) },
        { path: 'notes', element: withSuspense(<NotesPage />) },
        { path: 'quicknotes', element: withSuspense(<QuickNotesPage />) },
        { path: 'calendar', element: withSuspense(<CalendarPage />) },
        { path: 'live-subs', element: withSuspense(<LiveSubsPage />) },
        { path: 'theme', element: withSuspense(<ThemeBuilderPage />) },
        { path: 'dashboard', element: withSuspense(<UserDashboardPage />) },
        { path: 'my-content', element: withSuspense(<MyContentPage />) },
        { path: 'tags', element: withSuspense(<TagCloudPage />) },
        { path: 'users', element: withSuspense(<UserSearchPage />) },
        { path: 'wishlist-folders', element: withSuspense(<WishlistFoldersPage />) },
        { path: 'coupons', element: withSuspense(<CouponCenterPage />) },
        { path: 'polls', element: withSuspense(<PollPage />) },
        { path: 'live-calendar', element: withSuspense(<LiveCalendarPage />) },
        { path: 'orders', element: withSuspense(<PurchaseHistoryPage />) },
        { path: 'forum', element: withSuspense(<ForumPage />) },
        { path: 'inbox', element: withSuspense(<InboxPageRoute />) },
        { path: 'ai-writer', element: withSuspense(<AIWriterPage />) },
        { path: 'tracker', element: withSuspense(<OrderTrackerPage />) },
        { path: 'compare', element: withSuspense(<ProductComparePage />) },
        { path: 'creator-studio', element: withSuspense(<CreatorStudioPage />) },
        { path: 'gift-leaderboard', element: withSuspense(<GiftLeaderboardPage />) },
        { path: 'redpacket', element: withSuspense(<RedPacketPage />) },
        { path: 'groupbuy', element: withSuspense(<GroupBuyPage />) },
        { path: 'debate-leaderboard', element: withSuspense(<DebateLeaderboardPage />) },
        { path: 'qa-v2', element: withSuspense(<ProductQAV2Page />) },
        { path: 'qa-v2/:productId', element: withSuspense(<ProductQAV2Page />) },
        { path: 'live-pk', element: withSuspense(<LivePKPage />) },
        { path: 'academy', element: withSuspense(<CreatorAcademyPage />) },
        { path: 'live-shop', element: withSuspense(<LiveShopWindowPage />) },
        { path: 'product-3d/:id', element: withSuspense(<Product3DPage />) },
        { path: 'replay-editor', element: withSuspense(<ReplayEditorPage />) },
        { path: 'merchant', element: withSuspense(<MerchantOnboardingPage />) },
        { path: 'invite-v2', element: withSuspense(<InviteV2Page />) },
        { path: 'video-comments', element: withSuspense(<VideoCommentsPage />) },
        { path: 'danmaku-sentiment', element: withSuspense(<DanmakuSentimentPage />) },
        { path: 'revenue-calendar', element: withSuspense(<RevenueCalendarPage />) },
        { path: 'cart-suggestions', element: withSuspense(<CartSuggestionsPage />) },
        { path: 'privacy', element: withSuspense(<PrivacySettingsPage />) },
        { path: 'journey', element: withSuspense(<UserJourneyPage />) },
        { path: 'gallery', element: withSuspense(<ProductGalleryPage />) },
        { path: 'brand-story', element: withSuspense(<BrandStoryPage />) },
        { path: 'tools/social', element: withSuspense(<SocialToolsPage />) },
        { path: 'tools/personal', element: withSuspense(<PersonalHubPage />) },
        { path: 'tools/creator', element: withSuspense(<CreatorHubPage />) },
        { path: 'tools/life', element: withSuspense(<LifeHubPage />) },
        { path: 'tools/explore', element: withSuspense(<ExploreHubPage />) },
        { path: 'tools/insights', element: withSuspense(<InsightsHubPage />) },
        { path: 'tools/create', element: withSuspense(<CreateHubPage />) },
        { path: 'tools/dev', element: withSuspense(<DevHubPage />) },
        { path: 'tools/fun', element: withSuspense(<FunHubPage />) },
        { path: 'tools/life2', element: withSuspense(<LifeHub2Page />) },
        { path: 'tools/finance', element: withSuspense(<FinanceHubPage />) },
        { path: 'tools/health', element: withSuspense(<HealthHubPage />) },
        { path: 'tools/travel', element: withSuspense(<TravelHubPage />) },
        { path: 'tools/invest', element: withSuspense(<InvestHubPage />) },
        { path: 'tools/learn', element: withSuspense(<LearnHubPage />) },
        { path: 'tools/food', element: withSuspense(<FoodHubPage />) },
        { path: 'tools/music', element: withSuspense(<MusicHubPage />) },
        { path: 'tools/family', element: withSuspense(<FamilyHubPage />) },
        { path: 'tools/pets', element: withSuspense(<PetHubPage />) },
        { path: 'tools/ai', element: withSuspense(<AIHubPage />) },
        { path: 'tools/photo', element: withSuspense(<PhotographyHubPage />) },
        { path: 'tools/math', element: withSuspense(<MathHubPage />) },
        { path: 'tools/car', element: withSuspense(<CarHubPage />) },
        { path: 'tools/astro', element: withSuspense(<AstrologyHubPage />) },
        { path: 'tools/garden', element: withSuspense(<GardeningHubPage />) },
        { path: 'ai-assistant', element: withSuspense(<AIAssistantPage />) },
        { path: 'performance', element: withSuspense(<PerformancePage />) },
        { path: 'creator-dashboard', element: withSuspense(<CreatorDashboardPage />) },
        { path: 'search', element: withSuspense(<SearchResultsPage />) },
        { path: 'observability', element: withSuspense(<AnalyticsDashboard />) },
        { path: 'admin-panel', element: withSuspense(<AdminDashboard />) },
        { path: 'design-system', element: withSuspense(<DesignSystemPage />) },
        { path: 'realtime', element: withSuspense(<RealtimePage />) },
        { path: 'ml', element: withSuspense(<MLPipelinePage />) },
        { path: 'plugins', element: withSuspense(<PluginsPage />) },
        { path: 'graphql', element: withSuspense(<GraphQLPage />) },
        { path: 'vector', element: withSuspense(<VectorPage />) },
        { path: 'edge', element: withSuspense(<EdgePage />) },
        { path: 'federation', element: withSuspense(<FederationPage />) },
        { path: 'workflow', element: withSuspense(<WorkflowPage />) },
        { path: 'tenant', element: withSuspense(<TenantPage />) },
        { path: 'privacy', element: withSuspense(<PrivacyPage />) },
        { path: 'notif', element: withSuspense(<NotifPage />) },
        { path: 'queue', element: withSuspense(<QueuePage />) },
        { path: 'secrets', element: withSuspense(<SecretsPage />) },
        { path: 'gateway', element: withSuspense(<GatewayPage />) },
        { path: 'featflag', element: withSuspense(<FeatflagPage />) },
        { path: 'distlock', element: withSuspense(<DistlockPage />) },
        { path: 'filestore', element: withSuspense(<FilestorePage />) },
        { path: 'shop/shorts', element: withSuspense(<ShortVideoPage />) },
        { path: 'shop/shorts/:id', element: withSuspense(<ShortVideoDetailPage />) },
        { path: 'shop/shorts/creator/:creatorId', element: withSuspense(<ShortVideoCreatorPage />) },
        { path: 'shop/bundles', element: withSuspense(<BundlesPage />) },
        { path: 'shop/curator', element: withSuspense(<CuratorPage />) },
        { path: 'shop/flash', element: withSuspense(<FlashSalePage />) },
        { path: 'foryou', element: withSuspense(<ForYouPage />) },
        { path: 'campaign', element: withSuspense(<CampaignPage />) },
        { path: 'campaign/:id', element: withSuspense(<CampaignPage />) },
        { path: 'checkin', element: withSuspense(<SignInCalendarPage />) },
        { path: 'shop/filter', element: withSuspense(<ShopFilterPage />) },
        { path: 'shop/:id', element: withSuspense(<ProductDetailV2 />) },
        { path: 'shop-legacy', element: withSuspense(<ShopListPage />) },
        { path: 'shop-legacy/:id', element: withSuspense(<ProductDetailPage />) },
        { path: 'cart', element: withSuspense(<CartPage />) },
        { path: 'checkout', element: withSuspense(<CheckoutPage />) },
        { path: 'checkout/success', element: withSuspense(<CheckoutSuccessPage />) },

        { path: 'u/:username', element: withSuspense(<CreatorProfilePage />) },
        { path: 'profile-legacy/:username', element: withSuspense(<UserProfilePage />) },
        { path: 'profile', element: withSuspense(<ProfilePage />) },
        { path: 'profile/wishlist', element: withSuspense(<WishlistPage />) },
        { path: 'profile/orders', element: withSuspense(<OrdersPage />) },
        { path: 'profile/settings', element: withSuspense(<SettingsPage />) },
        { path: 'orders/:id', element: withSuspense(<OrderDetailPage />) },
        { path: 'orders/:orderId/aftersales', element: withSuspense(<AfterSalesPage />) },
        { path: 'orders/:orderId/review', element: withSuspense(<ReviewPage />) },
        { path: 'help/support', element: withSuspense(<SupportPage />) },
        { path: 'help/member', element: withSuspense(<MemberPage />) },
        { path: 'profile/addresses', element: withSuspense(<AddressBookPage />) },
        { path: 'settings', element: withSuspense(<SettingsPage />) },

        { path: 'p/:id', element: withSuspense(<PostDetailPage />) },

        {
          path: 'admin',
          element: withSuspense(<AdminLayout />),
          children: [
            { index: true, element: withSuspense(<AdminDashboardPage />) },
            { path: 'users', element: withSuspense(<AdminUsersPage />) },
            { path: 'moderation', element: withSuspense(<AdminModerationPage />) },
            { path: 'stats', element: withSuspense(<AdminStatsPage />) },
            { path: 'analytics', element: withSuspense(<AdminAnalyticsPage />) },
          ],
        },

        { path: 'about', element: withSuspense(<AboutPage />) },
        { path: '*', element: withSuspense(<NotFoundPage />) },
      ],
    },
    {
      path: '/auth',
      element: <AuthLayout />,
      children: [
        { index: true, element: withSuspense(<AuthPage />) },
        { path: ':mode', element: withSuspense(<AuthPage />) },
      ],
    },
  ],
  { basename: '/versa/' }
)
