import { Head, Link } from '@inertiajs/react';

export default function Home() {
    return (
        <>
            <Head title="Home" />

            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Buffet Ramadhan Booking</h1>
                    <p className="text-gray-600 mb-8">Book your table using the restaurant referral link</p>
                    
                    <div className="bg-white shadow-md rounded-lg p-6">
                        <p className="text-sm text-gray-600 mb-4">
                            Enter the referral code provided by the restaurant to make a booking.
                        </p>
                        <div className="space-y-4">
                            <Link
                                href="/login"
                                className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-center"
                            >
                                Restaurant Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
