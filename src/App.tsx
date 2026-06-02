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
        { path: 'shop/live-schedule', element: withSuspense(<LiveSchedulePage />) },
        { path: 'help', element: withSuspense(<HelpCenterPage />) },
        { path: 'qa', element: withSuspense(<ProductQAPage />) },
        { path: 'qa/:productId', element: withSuspense(<ProductQAPage />) },
        { path: 'tracking/:orderId', element: withSuspense(<OrderTrackingPage />) },
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
