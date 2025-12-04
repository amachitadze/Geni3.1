import React from 'react';

interface NameListProps {
  title: string;
  names: { name: string; count: number }[];
}

const NameList: React.FC<NameListProps> = ({ title, names }) => {
  return (
    <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 h-full">
      <h4 className="font-semibold text-center text-gray-700 dark:text-gray-300 mb-3">{title}</h4>
      {names.length > 0 ? (
        <ol className="space-y-2">
          {names.map((item, index) => (
            <li key={index} className="flex justify-between items-center text-sm">
              <span className="text-gray-800 dark:text-gray-200">
                <span className="font-mono text-xs text-gray-400 dark:text-gray-500 mr-2">{index + 1}.</span>
                {item.name}
              </span>
              <span className="font-semibold font-mono px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                {item.count}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-4">მონაცემები არ არის</p>
      )}
    </div>
  );
};

export default NameList;