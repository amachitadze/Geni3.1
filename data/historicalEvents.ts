
export interface HistoricalEvent {
    year: number;
    label: string;
    category: 'geo' | 'world'; // Georgia or World
}

export const historicalEvents: HistoricalEvent[] = [
    // World Events
    { year: 1800, label: "სამრეწველო რევოლუცია", category: "world" },
    { year: 1914, label: "I მსოფლიო ომი", category: "world" },
    { year: 1918, label: "I მსოფლიო ომის დასასრული", category: "world" },
    { year: 1939, label: "II მსოფლიო ომი", category: "world" },
    { year: 1945, label: "II მსოფლიო ომის დასასრული", category: "world" },
    { year: 1969, label: "ადამიანი მთვარეზე", category: "world" },
    { year: 1989, label: "ბერლინის კედლის დაცემა", category: "world" },
    { year: 2001, label: "11 სექტემბერი", category: "world" },
    { year: 2020, label: "COVID-19 პანდემია", category: "world" },

    // Georgian Events
    { year: 1801, label: "რუსეთის მიერ ქართლ-კახეთის ანექსია", category: "geo" },
    { year: 1832, label: "1832 წლის შეთქმულება", category: "geo" },
    { year: 1918, label: "საქართველოს დამოუკიდებლობა", category: "geo" },
    { year: 1921, label: "საბჭოთა ოკუპაცია", category: "geo" },
    { year: 1956, label: "9 მარტის ტრაგედია", category: "geo" },
    { year: 1978, label: "ქართული ენის დაცვის დღე", category: "geo" },
    { year: 1989, label: "9 აპრილის ტრაგედია", category: "geo" },
    { year: 1991, label: "დამოუკიდებლობის აღდგენა", category: "geo" },
    { year: 1992, label: "აფხაზეთის ომი", category: "geo" },
    { year: 2003, label: "ვარდების რევოლუცია", category: "geo" },
    { year: 2008, label: "რუსეთ-საქართველოს ომი", category: "geo" },
];
