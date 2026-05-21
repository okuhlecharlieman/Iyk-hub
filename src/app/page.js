'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import BoostBadge from '../components/BoostBadge';

const HomePage = () => {
    const [featuredUsers, setFeaturedUsers] = useState([]);

    useEffect(() => {
        const fetchFeaturedUsers = async () => {
            const res = await fetch('/api/users/featured');
            const data = await res.json();
            setFeaturedUsers(data.featuredUsers);
        };

        fetchFeaturedUsers();
    }, []);

    return (
        <div className="min-h-screen pt-20 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">Creator Boost</span>
                    </h1>
                    <p className="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                        Supercharge your creative journey. Get discovered, connect with peers, and unlock exclusive opportunities.
                    </p>
                </div>

                {featuredUsers.length > 0 && (
                    <div className="mt-16">
                        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">Featured Creators</h2>
                        <Swiper
                            modules={[Navigation, Pagination, Autoplay]}
                            spaceBetween={50}
                            slidesPerView={3}
                            navigation
                            pagination={{ clickable: true }}
                            autoplay={{ delay: 3000 }}
                            className="mySwiper"
                        >
                            {featuredUsers.map(user => (
                                <SwiperSlide key={user.uid}>
                                    <Link href={`/u/${user.uid}`} className="block bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center hover:scale-105 transition-transform duration-300">
                                        <img src={user.photoURL || '/logo.png'} alt={user.displayName} className="w-24 h-24 rounded-full mx-auto mb-4" onError={(e)=>{ e.target.src='/logo.png'; }} />
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-center gap-1">
                                            {user.displayName}
                                            {user.boostBadge && <BoostBadge badge={user.boostBadge.badge} label={user.boostBadge.badgeLabel} inline />}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.bio}</p>
                                    </Link>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomePage;
