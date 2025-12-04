export const formatTimestamp = (isoString: string | null): string => {
    if (!isoString) return 'უცნობია';
    try {
        const date = new Date(isoString);
        const formattedDate = date.toLocaleDateString('ka-GE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
        const formattedTime = date.toLocaleTimeString('ka-GE', {
            hour: '2-digit',
            minute: '2-digit',
        });
        return `${formattedDate} ${formattedTime}`;
    } catch (error) {
        return 'არასწორი თარიღი';
    }
};

export const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return 'უცნობია';
    // Matches YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-');
        return `${d}.${m}.${y}`;
    }
    // Matches YYYY or other formats (already formatted in input)
    return dateStr;
};

export const calculateAge = (birthDate?: string, deathDate?: string): number | null => {
    if (!birthDate) return null;
    const start = new Date(birthDate);
    const end = deathDate ? new Date(deathDate) : new Date();
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        // Fallback for only year being present if new Date() fails.
        const startYear = parseInt(birthDate.substring(0, 4), 10);
        if (isNaN(startYear)) return null;

        const endYear = deathDate 
            ? parseInt(deathDate.substring(0, 4), 10)
            : new Date().getFullYear();
        
        const finalEndYear = isNaN(endYear) ? new Date().getFullYear() : endYear;
        const age = finalEndYear - startYear;
        return age < 0 ? 0 : age;
    }

    let age = end.getFullYear() - start.getFullYear();
    const m = end.getMonth() - start.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < start.getDate())) {
        age--;
    }
    return age < 0 ? 0 : age;
};

export const getYear = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString.substring(0, 4); // Fallback to substring if full date invalid
    return date.getFullYear();
}

// Converts storage format (YYYY-MM-DD or YYYY) to display format (DD.MM.YYYY or YYYY)
export const convertStorageToDisplay = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) { // YYYY-MM-DD
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  }
  return dateStr; // Assume YYYY
};

// Converts display format (DD.MM.YYYY or YYYY) to storage format (YYYY-MM-DD or YYYY)
export const convertDisplayToStorage = (dateStr: string): string => {
    if (!dateStr) return '';
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) { // DD.MM.YYYY
        const [d, m, y] = dateStr.split('.');
        return `${y}-${m}-${d}`;
    }
    if (/^\d{4}$/.test(dateStr)) { // YYYY
        return dateStr;
    }
    return ''; // Return empty for invalid format to avoid data corruption
};
