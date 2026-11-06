/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Analysis from "./pages/Analysis";
import Script from "./pages/Script";
import Scenes from "./pages/Scenes";
import ShotList from "./pages/ShotList";
import Schedule from "./pages/Schedule";
import Promo from "./pages/Promo";

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="new" element={<Home />} />
            <Route path="analysis" element={<Analysis />} />
            <Route path="script" element={<Script />} />
            <Route path="scenes" element={<Scenes />} />
            <Route path="shotlist" element={<ShotList />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="promo" element={<Promo />} />
          </Route>
        </Routes>
      </Router>
    </AppProvider>
  );
}


