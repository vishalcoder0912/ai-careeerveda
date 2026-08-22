import {BrowserRouter, Routes, Route, Link} from "react-router-dom";

import {AuthProvider, useAuth} from "./context/AuthContext";
import {ToastProvider} from "./context/ToastContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ResourceList from "./pages/ResourceList";
import ResourceEditor from "./pages/ResourceEditor";
import MediaLibrary from "./pages/MediaLibrary";
import Leads from "./pages/Leads";
import Profile from "./pages/Profile";

const NotFound = () => (
  <div className="page state state--empty">
    <h1>404</h1>
    <p>That screen does not exist.</p>
    <Link className="btn btn--primary" to="/">
      Back to the dashboard
    </Link>
  </div>
);

const Forbidden = () => (
  <div className="page state state--empty">
    <h1>403</h1>
    <p>Your account does not have permission to open this section.</p>
    <Link className="btn btn--primary" to="/">
      Back to the dashboard
    </Link>
  </div>
);

// Guards a route on the permission the server will check anyway. The point is
// to show a clear 403 rather than let the screen mount and fill with failed
// requests — not to be the security boundary, which lives in the API.
const Guarded = ({permission, children}) => {
  const {can} = useAuth();
  if (permission && !can(permission)) return <Forbidden />;
  return children;
};

const Shell = () => {
  const {admin, restoring} = useAuth();

  // Neither signed in nor signed out yet. Rendering the login form here would
  // flash it at someone whose session is about to be restored.
  if (restoring) {
    return (
      <div className="boot" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <p>Restoring your session…</p>
      </div>
    );
  }

  if (!admin) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />

        <Route path="/:resource" element={<ResourceList />} />
        <Route path="/:resource/:id" element={<ResourceEditor />} />

        <Route
          path="/media"
          element={
            <Guarded permission="media.manage">
              <MediaLibrary />
            </Guarded>
          }
        />
        <Route
          path="/leads"
          element={
            <Guarded permission="forms.read">
              <Leads />
            </Guarded>
          }
        />
        <Route path="/profile" element={<Profile />} />
        <Route path="/403" element={<Forbidden />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

const App = () => (
  <BrowserRouter>
    <ToastProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>
);

export default App;
