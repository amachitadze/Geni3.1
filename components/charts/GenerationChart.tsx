import React, { useEffect, useRef } from 'react';

declare const Chart: any;

interface GenerationChartProps {
  labels: string[];
  data: number[];
  theme: 'light' | 'dark';
}

const GenerationChart: React.FC<GenerationChartProps> = ({ labels, data, theme }) => {
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
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        chartInstanceRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'ადამიანების რაოდენობა',
              data: data,
              fill: true,
              backgroundColor: 'rgba(168, 85, 247, 0.2)',
              borderColor: 'rgba(168, 85, 247, 1)',
              tension: 0.3,
              pointBackgroundColor: 'rgba(168, 85, 247, 1)',
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: 'rgba(168, 85, 247, 1)',
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  color: textColor,
                  precision: 0,
                },
                grid: {
                  color: gridColor,
                }
              },
              x: {
                ticks: {
                  color: textColor,
                },
                grid: {
                  display: false,
                }
              }
            },
            plugins: {
              legend: {
                display: false
              },
              title: {
                display: false
              }
            }
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

export default GenerationChart;