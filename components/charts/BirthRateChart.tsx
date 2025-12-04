import React, { useEffect, useRef } from 'react';

declare const Chart: any;

interface BirthRateChartProps {
  labels: string[];
  data: number[];
  theme: 'light' | 'dark';
}

const BirthRateChart: React.FC<BirthRateChartProps> = ({ labels, data, theme }) => {
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
              label: 'საშუალო შობადობა',
              data: data,
              fill: true,
              backgroundColor: 'rgba(236, 72, 153, 0.2)', // Pink color for variety
              borderColor: 'rgba(236, 72, 153, 1)',
              tension: 0.3,
              pointBackgroundColor: 'rgba(236, 72, 153, 1)',
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: 'rgba(236, 72, 153, 1)',
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
                  precision: 1, // Allow decimals
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
              },
              tooltip: {
                 callbacks: {
                    label: function(context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.parsed.y.toFixed(1);
                        }
                        return label;
                    }
                 }
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

export default BirthRateChart;
