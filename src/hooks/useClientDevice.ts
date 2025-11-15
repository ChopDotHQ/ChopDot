import { useEffect, useState } from 'react';

export type ClientOS = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';

export interface ClientDeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isTouch: boolean;
  os: ClientOS;
  userAgent: string;
}

export interface DeviceEnv {
  userAgent: string;
  viewportWidth: number;
  pointerCoarse: boolean;
}

export const parseDeviceEnvironment = ({ userAgent, viewportWidth, pointerCoarse }: DeviceEnv): ClientDeviceInfo => {
  const ua = userAgent.toLowerCase();
  const isIOS = /iphone|ipod|ipad/.test(ua);
  const isAndroid = /android/.test(ua);
  const isAndroidTablet = isAndroid && !/mobile/.test(ua) && viewportWidth >= 768;
  const isTablet =
    /ipad/.test(ua) ||
    isAndroidTablet ||
    (!isIOS && !isAndroid && viewportWidth >= 768 && pointerCoarse);
  const isMobile = isIOS || isAndroid || (viewportWidth < 768 && pointerCoarse);
  let os: ClientOS = 'unknown';
  if (isIOS) os = 'ios';
  else if (isAndroid) os = 'android';
  else if (/windows/.test(ua)) os = 'windows';
  else if (/mac os|macintosh/.test(ua)) os = 'macos';
  else if (/linux/.test(ua)) os = 'linux';

  return {
    isMobile,
    isTablet,
    isTouch: pointerCoarse,
    os,
    userAgent,
  };
};

const defaultDevice: ClientDeviceInfo = {
  isMobile: false,
  isTablet: false,
  isTouch: false,
  os: 'unknown',
  userAgent: '',
};

export const useClientDevice = (): ClientDeviceInfo => {
  const [device, setDevice] = useState<ClientDeviceInfo>(defaultDevice);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const ua = window.navigator.userAgent;
    const width = window.innerWidth;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    setDevice(parseDeviceEnvironment({ userAgent: ua, viewportWidth: width, pointerCoarse: coarse }));
  }, []);

  return device;
};

export default useClientDevice;
