"use client";

interface WelcomeBackModalProps {
    onClose: () => void;
}

export default function WelcomeBackModal({ onClose }: WelcomeBackModalProps) {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-lg max-w-md w-full border border-gray-700">
                <h2 className="text-2xl font-bold mb-4 text-purple-400">Welcome Back! 👋</h2>
                <p className="text-gray-300 mb-6">
                    It's been a while! Don't worry, we've saved your spot.
                    Let's get you back on track with a quick refresher or jump straight into where you left off.
                </p>
                <button
                    onClick={onClose}
                    className="w-full py-3 bg-purple-600 rounded hover:bg-purple-700 font-bold"
                >
                    Let's Go!
                </button>
            </div>
        </div>
    );
}
