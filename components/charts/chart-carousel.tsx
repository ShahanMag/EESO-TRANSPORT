"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChartCarouselProps {
  charts: {
    title: string;
    component: React.ReactNode;
  }[];
  autoRotate?: boolean;
  intervalMs?: number;
}

export function ChartCarousel({
  charts,
  autoRotate = true,
  intervalMs = 5000
}: ChartCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!autoRotate || charts.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % charts.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [autoRotate, charts.length, intervalMs]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + charts.length) % charts.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % charts.length);
  };

  if (charts.length === 0) {
    return <div className="text-center text-gray-500">No charts available</div>;
  }

  return (
    <div className="relative">
      {/* Chart Display */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {charts.map((chart, index) => (
            <div key={index} className="min-w-full">
              <h3 className="text-lg font-semibold mb-4">{chart.title}</h3>
              {chart.component}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      {charts.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow-md"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow-md"
            onClick={goToNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Pagination Dots */}
      {charts.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {charts.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "w-8 bg-blue-600"
                  : "w-2 bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`Go to chart ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
