/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RoverProvider, useRover } from './context/RoverContext';
import { Header } from './components/navigation/Header';
import { RightDrawer } from './components/navigation/RightDrawer';
import { LeafParticles } from './components/effects/LeafParticles';
import { HeroSection } from './components/sections/HeroSection';
import { ArchitectureSection } from './components/sections/ArchitectureSection';
import { DevicesSection } from './components/sections/DevicesSection';
import { ResultsSection } from './components/sections/ResultsSection';
import { LiveStatusSection } from './components/sections/LiveStatusSection';
import { NavigationControllerSection } from './components/sections/NavigationControllerSection';
import { SupabaseConfigModal } from './components/modals/SupabaseConfigModal';
import { FieldSimulatorDrawer } from './components/modals/FieldSimulatorDrawer';
import { GeminiChatbot } from './components/chat/GeminiChatbot';
import { ShieldCheck, Cpu, Database, Sprout, Github, Radio } from 'lucide-react';

const RoverAppContent: React.FC = () => {
  const { activeSection, setActiveSection, isDrawerOpen, setIsDrawerOpen, t } = useRover();

  return (
    <div className="min-h-screen bg-[#050b07] text-[#e0ece4] relative selection:bg-emerald-500/30 selection:text-emerald-300 flex flex-col justify-between">
      {/* Animated Subtle Agricultural Background Leaves */}
      <LeafParticles />

      {/* Primary Sticky Header */}
      <Header onOpenDrawer={() => setIsDrawerOpen(true)} />

      {/* Sliding Right-Side Hamburger Drawer */}
      <RightDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Supabase Config Modal */}
      <SupabaseConfigModal />

      {/* Hardware Field Simulator Drawer */}
      <FieldSimulatorDrawer />

      {/* Farmer-Friendly Gemini AI Chatbot */}
      <GeminiChatbot />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1">
        {/* Active Section Rendering or Full Flow */}
        {activeSection === 'home' && (
          <>
            <HeroSection />
            <ArchitectureSection />
            <ResultsSection />
            <DevicesSection />
            <LiveStatusSection />
            <NavigationControllerSection />
          </>
        )}

        {activeSection === 'architecture' && <ArchitectureSection />}

        {activeSection === 'results' && <ResultsSection />}

        {activeSection === 'devices' && <DevicesSection />}

        {activeSection === 'live-status' && <LiveStatusSection />}

        {activeSection === 'navigation-controller' && <NavigationControllerSection />}
      </main>

      {/* Clean Engineering Footer */}
      <footer className="relative z-10 border-t border-emerald-950/80 bg-[#030704] py-12 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/50 flex items-center justify-center">
                  <span className="font-heading font-extrabold text-sm text-emerald-400">E</span>
                </div>
                <span className="font-heading font-bold text-lg text-white">EAAR</span>
              </div>
              <p className="text-xs text-slate-400 font-body leading-relaxed">
                Edge-AI Enabled Autonomous Agricultural Rover for crop-row navigation, plant disease classification, and precision electrostatic spraying.
              </p>
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-white font-semibold block mb-3">
                Compute Modules
              </span>
              <ul className="space-y-1.5 text-xs font-mono text-slate-400">
                <li>ESP32 DevKit · Navigation & RTOS</li>
                <li>Raspberry Pi 5 · Onnx Edge AI</li>
                <li>ESP32-S3 · 3-DOF Arm & Sensors</li>
                <li>Supabase · Realtime Cloud Hub</li>
              </ul>
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-white font-semibold block mb-3">
                Supported Regions
              </span>
              <ul className="space-y-1.5 text-xs font-body text-slate-400">
                <li>English · International</li>
                <li>ಕನ್ನಡ (Kannada) · Karnataka</li>
                <li>हिंदी (Hindi) · North India</li>
                <li>తెలుగు (Telugu) · Andhra & Telangana</li>
                <li>தமிழ் (Tamil) · Tamil Nadu</li>
              </ul>
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-white font-semibold block mb-3">
                Field Telemetry
              </span>
              <div className="p-3 rounded-xl bg-[#061008] border border-emerald-950 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span>WebSocket:</span>
                  <span className="text-emerald-400">Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Field Edition:</span>
                  <span className="text-cyan-400">2026.09</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <span className="text-emerald-400">Operational</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
            <span>© 2026 EAAR Robotics Project · Autonomous Agricultural Intelligence</span>
            <div className="flex items-center gap-4">
              <span>Precision Agriculture</span>
              <span>·</span>
              <span>Zero Drift Electrostatic Spraying</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <RoverProvider>
      <RoverAppContent />
    </RoverProvider>
  );
}
