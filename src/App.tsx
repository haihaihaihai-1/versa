import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { HomePage } from './pages/HomePage'
import { NewsListPage } from './pages/NewsListPage'
import { NewsDetailPage } from './pages/NewsDetailPage'
import { DebatesListPage } from './pages/DebatesListPage'
import { DebateDetailPage } from './pages/DebateDetailPage'
import { ShopListPage } from './pages/ShopListPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { CheckoutSuccessPage } from './pages/CheckoutSuccessPage'
import { ProfilePage } from './pages/ProfilePage'
import { WishlistPage } from './pages/WishlistPage'
import { OrdersPage } from './pages/OrdersPage'
import { AboutPage } from './pages/AboutPage'
import { NotFoundPage } from './pages/NotFoundPage'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Layout />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'news', element: <NewsListPage /> },
        { path: 'news/:id', element: <NewsDetailPage /> },
        { path: 'debates', element: <DebatesListPage /> },
        { path: 'debates/:id', element: <DebateDetailPage /> },
        { path: 'shop', element: <ShopListPage /> },
        { path: 'shop/:id', element: <ProductDetailPage /> },
        { path: 'cart', element: <CartPage /> },
        { path: 'checkout', element: <CheckoutPage /> },
        { path: 'checkout/success', element: <CheckoutSuccessPage /> },
        { path: 'profile', element: <ProfilePage /> },
        { path: 'profile/wishlist', element: <WishlistPage /> },
        { path: 'profile/orders', element: <OrdersPage /> },
        { path: 'profile/settings', element: <ProfilePage /> },
        { path: 'about', element: <AboutPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: '/versa/' }
)
