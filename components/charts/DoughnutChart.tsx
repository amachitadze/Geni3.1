import React, { useEffect, useRef } from 'react';

declare const Chart: any;

interface DoughnutChartProps {
  labels: string[];
  data: number[];
  theme: 'light' | 'dark';
}

const DoughnutChart: React.FC<DoughnutChartProps> = ({ labels, data, theme }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }

        const isDarkMode = theme === 'dark';
        const textColor = isDarkMode ? '#E5E7EB' : '#374151';

        chartInstanceRef.current = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: [
                'rgba(168, 85, 247, 0.7)', // Purple-500
                'rgba(236, 72, 153, 0.7)', // Pink-500
                'rgba(59, 130, 246, 0.7)', // Blue-500
                'rgba(245, 158, 11, 0.7)',  // Amber-500
              ],
              borderColor: isDarkMode ? 'rgba(31, 41, 55, 1)' : 'rgba(255, 255, 255, 1)',
              borderWidth: 2,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                 labels: {
                    color: textColor,
                    boxWidth: 12,
                    padding: 15,
                 }
              },
              title: {
                display: false,
              }
            },
            cutout: '60%',
          }
        });
      }
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [labels, data, theme]);

  return <canvas ref={chartRef} />;
};

export default DoughnutChart;