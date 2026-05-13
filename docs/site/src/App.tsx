import { Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar.js";
import ApiReferencePage from "./pages/ApiReference.js";
import GettingStartedPage from "./pages/GettingStarted.js";
import HomePage from "./pages/Home.js";
import MigrationReactPlayerPage from "./pages/migration/FromReactPlayer.js";
import MigrationVideoJsPage from "./pages/migration/FromVideoJs.js";
import PlaygroundPage from "./pages/Playground.js";
import PluginAuthoringPage from "./pages/PluginAuthoring.js";
import PluginsPage from "./pages/Plugins.js";
import PublicLaunchPage from "./pages/PublicLaunch.js";

export default function App() {
  return (
    <div className="site-layout">
      <Sidebar />
      <main className="site-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/getting-started" element={<GettingStartedPage />} />
          <Route path="/api" element={<ApiReferencePage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/plugin-authoring" element={<PluginAuthoringPage />} />
          <Route path="/playground" element={<PlaygroundPage />} />
          <Route path="/launch" element={<PublicLaunchPage />} />
          <Route path="/migration/react-player" element={<MigrationReactPlayerPage />} />
          <Route path="/migration/videojs" element={<MigrationVideoJsPage />} />
        </Routes>
      </main>
    </div>
  );
}
