import { Head } from '@inertiajs/react';

export default function GuestLayout({ children, title }) {
    return (
        <>
            <Head title={title} />

            <div className="min-h-screen bg-gray-50 flex flex-col sm:justify-center items-center pt-6 sm:pt-0">
                <div className="w-full sm:max-w-md mt-6 px-6 py-4 bg-white shadow-md overflow-hidden sm:rounded-lg">
                    {children}
                </div>
            </div>
        </>
    );
}
