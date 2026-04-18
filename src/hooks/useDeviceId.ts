import { useEffect, useState } from "react";

const KEY = "rufayq_device_id";

export const getDeviceId = (): string => {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
};

export const useDeviceId = () => {
  const [deviceId, setDeviceId] = useState<string>("");
  useEffect(() => { setDeviceId(getDeviceId()); }, []);
  return deviceId;
};
