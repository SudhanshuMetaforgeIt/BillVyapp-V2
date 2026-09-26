'use client';

import { CustomerHero } from './customer-hero';
import { CategoryBar } from './category-bar';
import { PopularSalonsSection } from './popular-salons-section';
import { PopularServicesSection } from './popular-services-section';

export function CustomerDashboardView() {
  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* 1. Hero & Search + Promo Section */}
      <CustomerHero />

      {/* 2. Category Quick Filters */}
      <CategoryBar />

      {/* 3. Popular Salons */}
      <PopularSalonsSection />

      {/* 4. Popular Services */}
      <PopularServicesSection />
    </div>
  );
}
