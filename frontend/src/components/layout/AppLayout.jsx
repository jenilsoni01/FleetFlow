import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppLayout({ title, children }) {
  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-52 min-w-0">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto px-6 py-5">{children}</main>
      </div>
    </div>
  );
}
