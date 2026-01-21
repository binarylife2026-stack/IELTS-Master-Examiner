
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-[#003399] text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
            <span className="text-[#003399] font-bold">i</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">IELTS <span className="font-light">Master Examiner</span></h1>
        </div>
        <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <span className="bg-red-600 px-3 py-1 rounded-full text-xs uppercase font-bold">Band 8.0 Target</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>AI Examiner Online</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
