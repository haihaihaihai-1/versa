import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { AuthLayout } from './components/layout/AuthLayout'

import { HomePage } from './pages/HomePage'
import { NewsListPage } from './pages/NewsListPage'
import { NewsDetailPage } from './pages/NewsDetailPage'
import { DebatesListPage } from './pages/DebatesListPage'
import { DebateDetailPage } from './pages/DebateDetailPage'
import { ShopListPage } from './pages/ShopListPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { ShopHomePage } from './pages/ShopHomePage'
import { ProductDetailV2 } from './pages/ProductDetailV2'
import { BrandPage } from './pages/BrandPage'
import { BrandStreetPage } from './pages/BrandStreetPage'
import { CouponsPage } from './pages/CouponsPage'
import { LiveShoppingPage } from './pages/LiveShoppingPage'
import { ComparePage } from './pages/ComparePage'
import ShortVideoPage from './pages/ShortVideoPage'
import ShortVideoDetailPage from './pages/ShortVideoDetailPage'
import ShortVideoCreatorPage from './pages/ShortVideoCreatorPage'
import SupportPage from './pages/SupportPage'
import MemberPage from './pages/MemberPage'
import NotificationsHubPage from './pages/NotificationsHubPage'
import BundlesPage from './pages/BundlesPage'
import CuratorPage from './pages/CuratorPage'
import AddressBookPage from './pages/AddressBookPage'
import FlashSalePage from './pages/FlashSalePage'
import { DebateHomePage } from './pages/DebateHomePage'
import { DebateDetailV2 } from './pages/DebateDetailV2'
import { RoundTablePage } from './pages/RoundTablePage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { CheckoutSuccessPage } from './pages/CheckoutSuccessPage'
import { ProfilePage } from './pages/ProfilePage'
import { WishlistPage } from './pages/WishlistPage'
import { OrdersPage } from './pages/OrdersPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { AfterSalesPage } from './pages/AfterSalesPage'
import { ReviewPage } from './pages/ReviewPage'
import { AboutPage } from './pages/AboutPage'
import { NotFoundPage } from './pages/NotFoundPage'

// 新增的社交页面
import { AuthPage } from './pages/AuthPage'
import { FeedPage } from './pages/FeedPage'
import { PostDetailPage } from './pages/PostDetailPage'
import { ComposePage } from './pages/ComposePage'
import { UserProfilePage } from './pages/UserProfilePage'
import { MessagesPage } from './pages/MessagesPage'
import { ChatPage } from './pages/ChatPage'
import { GroupsPage } from './pages/GroupsPage'
import { GroupDetailPage } from './pages/GroupDetailPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { SearchPage } from './pages/SearchPage'
import { SettingsPage } from './pages/SettingsPage'
import { AdminLayout } from './pages/AdminPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { AdminModerationPage } from './pages/AdminModerationPage'
import { AdminStatsPage } from './pages/AdminStatsPage'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Layout />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'feed', element: <FeedPage /> },
        { path: 'explore', element: <FeedPage /> },
        { path: 'search', element: <SearchPage /> },
        { path: 'notifications', element: <NotificationsPage /> },
        { path: 'messages', element: <NotificationsHubPage /> },
        { path: 'messages/:id', element: <ChatPage /> },
        { path: 'compose', element: <ComposePage /> },
        { path: 'groups', element: <GroupsPage /> },
        { path: 'groups/:id', element: <GroupDetailPage /> },

        { path: 'news', element: <NewsListPage /> },
        { path: 'news/:id', element: <NewsDetailPage /> },
        { path: 'debates', element: <DebateHomePage /> },
        { path: 'debates/roundtable/:id', element: <RoundTablePage /> },
        { path: 'debates/:id', element: <DebateDetailV2 /> },
        { path: 'debates-legacy', element: <DebatesListPage /> },
        { path: 'debates-legacy/:id', element: <DebateDetailPage /> },
        { path: 'shop', element: <ShopHomePage /> },
        { path: 'shop/brand/:id', element: <BrandPage /> },
        { path: 'shop/brands', element: <BrandStreetPage /> },
        { path: 'shop/coupons', element: <CouponsPage /> },
        { path: 'shop/compare', element: <ComparePage /> },
        { path: 'shop/live', element: <LiveShoppingPage /> },
        { path: 'shop/live/:id', element: <LiveShoppingPage /> },
        { path: 'shop/shorts', element: <ShortVideoPage /> },
        { path: 'shop/shorts/:id', element: <ShortVideoDetailPage /> },
        { path: 'shop/shorts/creator/:creatorId', element: <ShortVideoCreatorPage /> },
        { path: 'shop/bundles', element: <BundlesPage /> },
        { path: 'shop/curator', element: <CuratorPage /> },
        { path: 'shop/flash', element: <FlashSalePage /> },
        { path: 'shop/:id', element: <ProductDetailV2 /> },
        { path: 'shop-legacy', element: <ShopListPage /> },
        { path: 'shop-legacy/:id', element: <ProductDetailPage /> },
        { path: 'cart', element: <CartPage /> },
        { path: 'checkout', element: <CheckoutPage /> },
        { path: 'checkout/success', element: <CheckoutSuccessPage /> },

        { path: 'u/:username', element: <UserProfilePage /> },
        { path: 'profile', element: <ProfilePage /> },
        { path: 'profile/wishlist', element: <WishlistPage /> },
        { path: 'profile/orders', element: <OrdersPage /> },
        { path: 'profile/settings', element: <SettingsPage /> },
        { path: 'orders/:id', element: <OrderDetailPage /> },
        { path: 'orders/:orderId/aftersales', element: <AfterSalesPage /> },
        { path: 'orders/:orderId/review', element: <ReviewPage /> },
        { path: 'help/support', element: <SupportPage /> },
        { path: 'help/member', element: <MemberPage /> },
        { path: 'profile/addresses', element: <AddressBookPage /> },
        { path: 'settings', element: <SettingsPage /> },

        { path: 'p/:id', element: <PostDetailPage /> },

        {
          path: 'admin',
          element: <AdminLayout />,
          children: [
            { index: true, element: <AdminDashboardPage /> },
            { path: 'users', element: <AdminUsersPage /> },
            { path: 'moderation', element: <AdminModerationPage /> },
            { path: 'stats', element: <AdminStatsPage /> },
          ],
        },

        { path: 'about', element: <AboutPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
    {
      path: '/auth',
      element: <AuthLayout />,
      children: [
        { index: true, element: <AuthPage /> },
        { path: ':mode', element: <AuthPage /> },
      ],
    },
  ],
  { basename: '/versa/' }
)
