import { Routes, Route } from 'react-router';
import RequireAuth from '@/components/RequireAuth';
import Home from '@/pages/Home';
import Profile from '@/pages/Profile';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import CollectionDetail from '@/pages/CollectionDetail';
import Discover from '@/pages/Discover';
import UserProfile from '@/pages/UserProfile';
import SharedCapsule from '@/pages/SharedCapsule';
import Feed from '@/pages/Feed';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route
        path="/me"
        element={
          <RequireAuth>
            <Profile />
          </RequireAuth>
        }
      />
      <Route
        path="/collections/:id"
        element={
          <RequireAuth>
            <CollectionDetail />
          </RequireAuth>
        }
      />
      {/* 公开路由 */}
      <Route path="/discover" element={<Discover />} />
      <Route path="/u/:userId" element={<UserProfile />} />
      <Route path="/shared/:token" element={<SharedCapsule />} />
      {/* 需要登录 */}
      <Route
        path="/feed"
        element={
          <RequireAuth>
            <Feed />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default App;
