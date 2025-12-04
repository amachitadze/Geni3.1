import { Person, People } from '../types';

export const validatePeopleData = (data: any): { isValid: boolean; error: string | null } => {
    if (!data || typeof data.people !== 'object' || !Array.isArray(data.rootIdStack)) {
        return { isValid: false, error: "ფაილს არასწორი სტრუქტურა აქვს." };
    }
    const { people, rootIdStack } = data;
    const allIds = new Set(Object.keys(people));
    if (rootIdStack.some((id: string) => !allIds.has(id))) {
        return { isValid: false, error: "ფაილი დაზიანებულია: შეიცავს არასწორ კავშირს საწყის წევთან." };
    }
    for (const personId in people) {
        const person = people[personId];
        const checkId = (id: string | undefined, type: string) => {
            if (id && !allIds.has(id)) {
                return `პიროვნებას (${person.firstName} ${person.lastName}) აქვს არასწორი ${type} ID: ${id}`;
            }
            return null;
        };
        const checkIdArray = (ids: string[] | undefined, type: string) => {
            if (ids) {
                for (const id of ids) {
                    const err = checkId(id, type);
                    if (err) return err;
                }
            }
            return null;
        };
        const errors = [
            checkId(person.spouseId, 'მეუღლის'),
            checkIdArray(person.children, 'შვილის'),
            checkIdArray(person.parentIds, 'მშობლის'),
            checkIdArray(person.exSpouseIds, 'ყოფილი მეუღლის'),
        ].filter(Boolean);

        if (errors.length > 0) {
            return { isValid: false, error: errors.join('\n') };
        }
    }
    return { isValid: true, error: null };
};

export const getFamilyUnitFromConnection = (id1: string, id2: string, peopleData: People): Set<string> => {
    const p1 = peopleData[id1];
    const p2 = peopleData[id2];
    if (!p1 || !p2) return new Set([id1, id2]);

    let parents: Person[] = [];
    let children: Person[] = [];

    // Case 1: p1 and p2 are spouses
    if (p1.spouseId === id2) {
        parents = [p1, p2];
        children = p1.children.map(cId => peopleData[cId]).filter(Boolean);
    } 
    // Case 2: p1 is a parent of p2
    else if (p1.children.includes(id2)) {
        parents.push(p1);
        if (p1.spouseId && peopleData[p1.spouseId]) {
            parents.push(peopleData[p1.spouseId]);
        }
        children = p1.children.map(cId => peopleData[cId]).filter(Boolean);
    }
    // Case 3: p2 is a parent of p1
    else if (p2.children.includes(id1)) {
        parents.push(p2);
        if (p2.spouseId && peopleData[p2.spouseId]) {
            parents.push(peopleData[p2.spouseId]);
        }
        children = p2.children.map(cId => peopleData[cId]).filter(Boolean);
    }

    const familyIds = new Set<string>();
    parents.forEach(p => familyIds.add(p.id));
    children.forEach(c => familyIds.add(c.id));

    // If no family unit found (e.g., siblings, other relationships), just highlight the two connected people
    if (familyIds.size === 0) {
        familyIds.add(id1);
        familyIds.add(id2);
    }
    
    return familyIds;
};
