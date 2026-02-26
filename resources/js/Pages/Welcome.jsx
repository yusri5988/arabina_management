import React from 'react';
import { Head } from '@inertiajs/react';

export default function Welcome({ auth }) {
  return (
    <>
      <Head title="Welcome" />
      <div className="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gray-100">
        <div className="w-full sm:max-w-md mt-6 px-6 py-4 bg-white shadow-md overflow-hidden sm:rounded-lg">
          <div className="font-medium">Arabina Inventory Ready!</div>
          <a href="/login" className="inline-block mt-3 text-sm text-slate-700 underline">
            Go to Login
          </a>
        </div>
      </div>
    </>
  );
}
