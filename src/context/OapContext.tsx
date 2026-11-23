import { useState, type ReactNode } from "react";
import type { MockData } from "../types/oap";
import { OapContext } from "./oapContextDef";
import * as mock from "../data/mockData";

const initialData: MockData = {
  users: mock.users,
  personnel: mock.personnel,
  dormers: mock.dormers,
  attendanceCredentials: mock.attendanceCredentials,
  applicants: mock.applicants,
  buildings: mock.buildings,
  rooms: mock.rooms,
  beds: mock.beds,
  roomAssignments: mock.roomAssignments,
  attendanceRecords: mock.attendanceRecords,
  passSlips: mock.passSlips,
  renewalRequests: mock.renewalRequests,
  monitoringRecords: mock.monitoringRecords,
  notifications: mock.notifications,
};

export function OapProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<MockData>(initialData);

  return (
    <OapContext.Provider value={{ data, setData }}>
      {children}
    </OapContext.Provider>
  );
}
