import React from 'react';

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full skeleton-loader shrink-0"></div>
        <div className="space-y-2 flex-1">
          <div className="h-4 w-1/3 skeleton-loader"></div>
          <div className="h-3 w-1/4 skeleton-loader"></div>
        </div>
      </div>
      <div className="h-5 w-3/4 skeleton-loader"></div>
      <div className="space-y-2">
        <div className="h-3 w-full skeleton-loader"></div>
        <div className="h-3 w-5/6 skeleton-loader"></div>
      </div>
      <div className="h-8 w-1/3 skeleton-loader rounded-lg"></div>
    </div>
  );
};

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
};
