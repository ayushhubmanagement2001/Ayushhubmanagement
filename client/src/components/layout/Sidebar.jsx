import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  IndianRupee,
  Users,
  Wallet,
  AlertTriangle,
  Building2,
  FileText,
  BarChart3,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  NotebookPen,
} from 'lucide-react';

import websiteLogo from '../../wesbite_image_folder/wesbitelogo.png';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/my-payment', label: 'Franchise Payments', icon: IndianRupee },
  { path: '/payout-details', label: 'Rider Payout', icon: Users },
  { path: '/advanced', label: 'Rider Advances', icon: Wallet },
  { path: '/loss-details', label: 'Loss & Recovery', icon: AlertTriangle },
  { path: '/hub-expenses', label: 'Hub Expenses', icon: Building2 },
  { path: '/transactions', label: 'Transaction Ledger', icon: FileText },
  { path: '/reports', label: 'Reports', icon: BarChart3, hasSub: true },
  { path: '/notepad', label: 'Notepad', icon: NotebookPen },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/profile', label: 'Profile', icon: User },
];

export const Sidebar = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer - Dark Navy/Charcoal matching the image */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 bg-[#111827] border-r border-[#1F2937] flex flex-col justify-between
          transition-all duration-200 ease-in-out h-screen z-50 md:z-40
          w-64
          ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
          md:translate-x-0 md:shadow-none
          ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        `}
      >
        <div className="flex flex-col min-h-0">
          {/* Top Branding & Close Button */}
          <div
            className={`h-14 flex items-center border-b border-[#1F2937] px-4 justify-between shrink-0 bg-[#0F172A]/40 ${
              isCollapsed ? 'md:justify-center md:px-2' : 'md:justify-start md:gap-2.5'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={websiteLogo}
                alt="Logo"
                className="w-9 h-9 object-contain rounded-lg shrink-0 drop-shadow-xs"
              />
              <div
                className={`flex flex-col truncate ${
                  isCollapsed ? 'md:hidden' : 'flex'
                }`}
              >
                <span className="text-sm font-black text-white tracking-tight leading-tight">
                  AYUSH <span className="text-[#E53935]">HUB</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                  MANAGEMENT
                </span>
              </div>
            </div>

            {/* Mobile Close Button ('X') */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto">
            <div
              className={`px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider ${
                isCollapsed ? 'md:hidden' : 'block'
              }`}
            >
              MAIN MENU
            </div>

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (onCloseMobile) {
                      onCloseMobile();
                    }
                  }}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) => `
                    relative flex items-center rounded-xl text-xs font-semibold transition-all duration-150 group
                    ${
                      isCollapsed
                        ? 'md:justify-center md:p-3 px-3.5 py-2.5 gap-3'
                        : 'gap-3 px-3.5 py-2.5'
                    }
                    ${
                      isActive
                        ? 'bg-[#E53935] text-white shadow-sm font-bold'
                        : 'text-slate-300 hover:bg-[#1F2937] hover:text-white'
                    }
                  `}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-400 group-hover:text-white'
                        }`}
                      />
                      <span
                        className={`truncate ${
                          isCollapsed ? 'md:hidden' : 'inline'
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.hasSub && !isCollapsed && (
                        <ChevronDown
                          className={`w-3.5 h-3.5 ml-auto shrink-0 transition-colors ${
                            isActive
                              ? 'text-white'
                              : 'text-slate-400 group-hover:text-white'
                          }`}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Collapse Toggle (Desktop only) */}
        <div className="hidden md:flex p-2.5 border-t border-[#1F2937] bg-[#0B0F19] items-center justify-center shrink-0">
          <button
            type="button"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-[#1F2937] hover:text-white transition-colors cursor-pointer"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
