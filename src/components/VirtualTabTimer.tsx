import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Paper, Typography, Box } from '@mui/material';

export interface TabTimingData {
  [key: string]: number;
}

export interface VirtualTabTimerState {
  duration: number;
  isActive: boolean;
  startTime: Date | null;
}

export interface VirtualTabTimerProps {
  tabNames: readonly string[];
  currentTabIndex: number;
  initialTimings?: TabTimingData;
  onTabTimingUpdate?: (timings: TabTimingData) => void;
  onTabChange?: (newTabIndex: number) => void;
  showDebugPanel?: boolean;
  isPageVisible?: boolean;
  children?: (timerAPI: VirtualTabTimerAPI) => React.ReactNode;
}

export interface VirtualTabTimerAPI {
  changeTab: (newTabIndex: number) => void;
  getTabDuration: (tabName: string) => number;
  getCurrentTimingData: () => TabTimingData;
  stopAllTimers: () => void;
  getActiveTab: () => string | null;
  isTabActive: (tabName: string) => boolean;
  getTotalDuration: () => number;
}

export const VirtualTabTimer: React.FC<VirtualTabTimerProps> = ({
  tabNames,
  currentTabIndex,
  initialTimings = {},
  onTabTimingUpdate,
  onTabChange,
  showDebugPanel = false,
  isPageVisible = true,
  children
}) => {
  // Initialize virtual timing state
  const [virtualTiming, setVirtualTiming] = useState<Record<string, VirtualTabTimerState>>(
    Object.fromEntries(
      tabNames.map(name => [
        name,
        { 
          duration: initialTimings[`${name}_duration`] || 0, 
          isActive: false, 
          startTime: null 
        }
      ])
    )
  );

  const [timingInterval, setTimingInterval] = useState<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);
  const lastTimingDataRef = useRef<string>('');

  const changeTab = useCallback((newTabIndex: number) => {
    if (newTabIndex < 0 || newTabIndex >= tabNames.length) return;

    // Stop old tab - use the actual current tab index passed as prop
    setVirtualTiming(prev => {
      const currentTabName = tabNames[currentTabIndex];
      const newTabName = tabNames[newTabIndex];
      
      const updated = { ...prev };
      const currentTab = updated[currentTabName];
      if (currentTab && currentTab.isActive && currentTab.startTime) {
        const elapsed = Math.floor((Date.now() - currentTab.startTime.getTime()) / 1000);
        currentTab.duration += elapsed;
      }
      if (currentTab) {
        currentTab.isActive = false;
        currentTab.startTime = null;
      }

      // Start new tab
      const newTab = updated[newTabName];
      if (newTab) {
        newTab.isActive = true;
        newTab.startTime = new Date();
      }
      
      return updated;
    });

    // Ensure interval is running
    if (!timingInterval) {
      const interval = setInterval(() => {
        setVirtualTiming(prev => ({ ...prev })); // Trigger re-render for real-time updates
      }, 1000);
      setTimingInterval(interval);
    }

    // Notify parent component of tab change
    onTabChange?.(newTabIndex);
  }, [tabNames, currentTabIndex, timingInterval, onTabChange]);

  const getTabDuration = useCallback((tabName: string): number => {
    const tab = virtualTiming[tabName];
    if (!tab) return 0;
    
    if (tab.isActive && tab.startTime) {
      const elapsed = Math.floor((Date.now() - tab.startTime.getTime()) / 1000);
      return tab.duration + elapsed;
    }
    return tab.duration;
  }, [virtualTiming]);

  const getCurrentTimingData = useCallback((): TabTimingData => {
    const updated: TabTimingData = {};
    tabNames.forEach(name => {
      const tab = virtualTiming[name];
      if (!tab) {
        updated[`${name}_duration`] = 0;
        return;
      }
      
      if (tab.isActive && tab.startTime) {
        const elapsed = Math.floor((Date.now() - tab.startTime.getTime()) / 1000);
        updated[`${name}_duration`] = tab.duration + elapsed;
      } else {
        updated[`${name}_duration`] = tab.duration;
      }
    });
    return updated;
  }, [tabNames, virtualTiming]);

  const stopAllTimers = useCallback(() => {
    setVirtualTiming(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        const tab = updated[key];
        tab.isActive = false;
        tab.startTime = null;
      });
      return updated;
    });

    if (timingInterval) {
      clearInterval(timingInterval);
      setTimingInterval(null);
    }
  }, [timingInterval]);

  const getActiveTab = useCallback((): string | null => {
    for (const [tabName, tab] of Object.entries(virtualTiming)) {
      if (tab.isActive) return tabName;
    }
    return null;
  }, [virtualTiming]);

  const isTabActive = useCallback((tabName: string): boolean => {
    return virtualTiming[tabName]?.isActive || false;
  }, [virtualTiming]);

  const getTotalDuration = useCallback((): number => {
    return tabNames.reduce((total, name) => total + getTabDuration(name), 0);
  }, [tabNames, getTabDuration]);

  // Initialize timer for the first tab
  useEffect(() => {
    if (!isInitialized.current && tabNames.length > 0) {
      isInitialized.current = true;
      const timer = setTimeout(() => {
        changeTab(currentTabIndex);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [changeTab, currentTabIndex, tabNames.length]);

  // Handle currentTabIndex changes from parent component
  useEffect(() => {
    if (isInitialized.current && tabNames.length > 0) {
      // If the parent component changes the current tab index, we need to update our timing
      const currentTabName = tabNames[currentTabIndex];
      const activeTab = getActiveTab();
      
      // Only change tab if it's different from the currently active tab
      if (activeTab !== currentTabName) {
        console.log(`VirtualTabTimer: Parent changed tab to ${currentTabName} (index: ${currentTabIndex}), active was: ${activeTab}`);
        changeTab(currentTabIndex);
      }
    }
  }, [currentTabIndex, tabNames, getActiveTab, changeTab]);

  // Update parent with timing data when it changes
  const onTabTimingUpdateRef = useRef(onTabTimingUpdate);
  onTabTimingUpdateRef.current = onTabTimingUpdate;

  useEffect(() => {
    const timingData = getCurrentTimingData();
    const timingDataString = JSON.stringify(timingData);
    
    // Only update if the timing data has actually changed
    if (timingDataString !== lastTimingDataRef.current) {
      lastTimingDataRef.current = timingDataString;
      onTabTimingUpdateRef.current?.(timingData);
    }
  }, [virtualTiming, getCurrentTimingData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timingInterval) {
        clearInterval(timingInterval);
      }
    };
  }, [timingInterval]);

  // API object for child components
  const timerAPI: VirtualTabTimerAPI = {
    changeTab,
    getTabDuration,
    getCurrentTimingData,
    stopAllTimers,
    getActiveTab,
    isTabActive,
    getTotalDuration
  };

  const getTabDisplayName = (tabName: string): string => {
    // Convert tab names to display names
    const displayNames: Record<string, string> = {
      info: 'Info',
      pulling: 'Pulling Into Bay', 
      underhood: 'Underhood',
      tires: 'Tires & Brakes'
    };
    return displayNames[tabName] || tabName.charAt(0).toUpperCase() + tabName.slice(1);
  };

  return (
    <>
      {/* Debug Timing Panel */}
      {showDebugPanel && (
        <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 2 }}>
          <Typography variant="caption" component="div">
            <strong>Debug - Virtual Tab Timer:</strong>
          </Typography>
          <Typography variant="caption" component="div" sx={{ color: isPageVisible ? 'green' : 'red' }}>
            Page Visible: {isPageVisible ? 'YES' : 'NO'}
          </Typography>
          <Typography variant="caption" component="div" sx={{ color: isInitialized.current ? 'green' : 'red' }}>
            Timer Initialized: {isInitialized.current ? 'YES' : 'NO'}
          </Typography>
          <Typography variant="caption" component="div" sx={{ color: timingInterval ? 'green' : 'red' }}>
            Timing Interval Running: {timingInterval ? 'YES' : 'NO'}
          </Typography>
          {tabNames.map(name => (
            <Typography key={name} variant="caption" component="div">
              {getTabDisplayName(name)}: {getTabDuration(name)}s total
              {virtualTiming[name]?.isActive && ` (ACTIVE)`}
              {virtualTiming[name]?.startTime && ` - Started: ${virtualTiming[name].startTime?.toLocaleTimeString()}`}
            </Typography>
          ))}
          <Typography variant="caption" component="div" sx={{ mt: 1, fontStyle: 'italic' }}>
            Current Tab Index: {currentTabIndex} ({getTabDisplayName(tabNames[currentTabIndex])})
          </Typography>
          <Typography variant="caption" component="div" sx={{ mt: 1, fontStyle: 'italic', fontSize: '0.7rem' }}>
            Active Tabs: {Object.keys(virtualTiming).filter(key => virtualTiming[key].isActive).join(', ') || 'none'}
          </Typography>
          <Typography variant="caption" component="div" sx={{ mt: 1, fontWeight: 'bold' }}>
            Total Duration: {getTotalDuration()}s
          </Typography>
        </Paper>
      )}
      
      {/* Render children with timer API */}
      {children?.(timerAPI)}
    </>
  );
};

export default VirtualTabTimer; 