import React from 'react';
import { People } from '../types';
import PersonCard from './PersonCard';

interface TreeNodeProps {
  personId: string;
  viewRootId: string;
  people: People;
  onAdd: (personId: string) => void;
  onEdit: (personId:string) => void;
  onShowDetails: (personId: string) => void;
  onNavigate: (personId: string) => void;
  highlightedPersonId?: string | null;
  highlightedPeople: Set<string> | null;
  onConnectionClick: (p1: string, p2: string, type: 'spouse' | 'parent-child') => void;
  hoveredConnections: Set<string> | null;
  onSetHover: (personId: string | null) => void;
  viewMode: 'default' | 'compact';
  parentId?: string; // ID of the parent for this node, used for highlighting connection
}

const LinePaths: React.FC<{
  isHighlighted: boolean;
  isHoverHighlighted: boolean;
  path: string;
}> = ({ isHighlighted, isHoverHighlighted, path }) => (
  <>
    {/* Invisible wider path for easier clicking */}
    <path d={path} stroke="transparent" strokeWidth="20" fill="none" />
    {/* Visible path */}
    <path
      d={path}
      strokeWidth="2"
      fill="none"
      className={`transition-all duration-300 ${
        isHighlighted 
        ? 'stroke-purple-500' 
        : isHoverHighlighted
        ? 'stroke-purple-400'
        : 'stroke-gray-400 dark:stroke-gray-500 group-hover:stroke-gray-500 dark:group-hover:stroke-gray-400'
      }`}
    />
  </>
);


const TreeNode: React.FC<TreeNodeProps> = ({ 
  personId,
  viewRootId,
  people,
  onAdd,
  onEdit,
  onShowDetails,
  onNavigate,
  highlightedPersonId,
  highlightedPeople,
  onConnectionClick,
  hoveredConnections,
  onSetHover,
  viewMode,
  parentId
}) => {
  const person = people[personId];
  if (!person) return null;

  const isViewRoot = personId === viewRootId;
  const isCompact = viewMode === 'compact';

  const parents = isViewRoot
    ? person.parentIds.map(id => people[id]).filter(Boolean)
    : [];
  
  const spouse = person.spouseId ? people[person.spouseId] : null;
  const children = [...new Set(person.children)].map((childId: string) => people[childId]).filter(Boolean);

  const isConnectionHighlighted = (p1_id: string, p2_id: string) => {
    return !!(highlightedPeople && highlightedPeople.has(p1_id) && highlightedPeople.has(p2_id));
  };
  
  const isHoverConnected = (id: string) => !!hoveredConnections?.has(id);
  const isLineHoverHighlighted = (id1: string, id2: string) => isHoverConnected(id1) && isHoverConnected(id2);
  
  // Define dimensions for connectors to improve readability and maintainability
  const spouseConnectorWidth = isCompact ? 90 : 80;
  const parentToChildConnectorHeight = 40;
  const childToParentConnectorHeight = 40;
  const coupleToChildrenConnectorHeight = 40;

  const isChildNode = !isViewRoot && parentId;


  return (
    <div className="flex flex-col items-center">
      {/* PARENTS LEVEL: Rendered only for the root of the current view */}
      {isViewRoot && parents.length > 0 && (
        <>
          <div className="flex justify-center items-start">
            {parents.map((parent, index) => (
              <React.Fragment key={parent.id}>
                {index > 0 && parents[0] && (
                   <svg width={spouseConnectorWidth} height={40} className="self-center mx-2">
                     <g onClick={(e) => { e.stopPropagation(); onConnectionClick(parents[0].id, parent.id, 'spouse'); }} className="cursor-pointer group">
                        <LinePaths
                           path={`M 0 25 L ${spouseConnectorWidth} 25`}
                           isHighlighted={isConnectionHighlighted(parents[0].id, parent.id)}
                           isHoverHighlighted={isLineHoverHighlighted(parents[0].id, parent.id)}
                        />
                        <text x={spouseConnectorWidth / 2} y="15" textAnchor="middle" className="line-label">
                          მეუღლე
                        </text>
                     </g>
                   </svg>
                )}
                <div className={isCompact ? 'px-2' : 'px-2'}>
                   <PersonCard 
                    person={parent}
                    onAdd={onAdd}
                    onEdit={onEdit}
                    onShowDetails={onShowDetails}
                    onNavigate={onNavigate}
                    isHighlighted={parent.id === highlightedPersonId}
                    isConnectionHighlighted={!!highlightedPeople?.has(parent.id)}
                    isHoverConnected={isHoverConnected(parent.id)}
                    onSetHover={onSetHover}
                    viewMode={viewMode}
                  />
                </div>
              </React.Fragment>
            ))}
          </div>
           {/* Connector from parents down to main person */}
           <svg width={120} height={parentToChildConnectorHeight} className="my-1">
             <g onClick={(e) => { e.stopPropagation(); if (parents[0]) onConnectionClick(parents[0].id, personId, 'parent-child'); }} className="cursor-pointer group">
                <LinePaths
                    path={`M 60 0 L 60 ${parentToChildConnectorHeight}`}
                    isHighlighted={parents.some(p => isConnectionHighlighted(p.id, personId))}
                    isHoverHighlighted={parents.some(p => isLineHoverHighlighted(p.id, personId))}
                />
                <text x="68" y={parentToChildConnectorHeight / 2} textAnchor="start" dominantBaseline="middle" className="line-label">
                    მშობლები
                </text>
             </g>
           </svg>
        </>
      )}

      {/* MAIN LEVEL: The current person, their spouse, and their children. */}
      <div className="flex flex-col items-center">
        {/* Couple container */}
        <div className="flex items-center justify-center">
            <div 
              className="relative"
              style={{ marginTop: isChildNode ? `${childToParentConnectorHeight}px` : undefined }}
            >
                {/* This is the connector from a parent, appears only when this node is a child */}
                {isChildNode && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2">
                      <svg width={120} height={childToParentConnectorHeight}>
                          <g onClick={(e) => { e.stopPropagation(); onConnectionClick(parentId, personId, 'parent-child'); }} className="cursor-pointer group">
                            <LinePaths
                              path={`M 60 0 L 60 ${childToParentConnectorHeight}`}
                              isHighlighted={isConnectionHighlighted(parentId, personId)}
                              isHoverHighlighted={isLineHoverHighlighted(parentId, personId)}
                            />
                            <text x="68" y={childToParentConnectorHeight / 2} textAnchor="start" dominantBaseline="middle" className="line-label">
                                შვილი
                            </text>
                          </g>
                      </svg>
                    </div>
                )}
                <PersonCard 
                    person={person} 
                    onAdd={onAdd} 
                    onEdit={onEdit} 
                    onShowDetails={onShowDetails} 
                    onNavigate={onNavigate}
                    isHighlighted={person.id === highlightedPersonId}
                    isConnectionHighlighted={!!highlightedPeople?.has(person.id)}
                    isHoverConnected={isHoverConnected(person.id)}
                    onSetHover={onSetHover}
                    viewMode={viewMode}
                />
            </div>
            {spouse && (
                <>
                {/* Spouse Connector */}
                <svg width={spouseConnectorWidth} height={40} className="self-center mx-2">
                  <g onClick={(e) => { e.stopPropagation(); onConnectionClick(person.id, spouse.id, 'spouse'); }} className="cursor-pointer group">
                    <LinePaths
                       path={`M 0 25 L ${spouseConnectorWidth} 25`}
                       isHighlighted={isConnectionHighlighted(person.id, spouse.id)}
                       isHoverHighlighted={isLineHoverHighlighted(person.id, spouse.id)}
                    />
                    <text x={spouseConnectorWidth / 2} y="15" textAnchor="middle" className="line-label">
                      მეუღლე
                    </text>
                  </g>
                </svg>
                 <div style={{ marginTop: isChildNode ? `${childToParentConnectorHeight}px` : undefined }}>
                    <PersonCard 
                        person={spouse} 
                        onAdd={onAdd} 
                        onEdit={onEdit} 
                        onShowDetails={onShowDetails} 
                        onNavigate={onNavigate}
                        isHighlighted={spouse.id === highlightedPersonId}
                        isConnectionHighlighted={!!highlightedPeople?.has(spouse.id)}
                        isHoverConnected={isHoverConnected(spouse.id)}
                        onSetHover={onSetHover}
                        viewMode={viewMode}
                    />
                </div>
                </>
            )}
        </div>

        {/* Connector from couple down to children area */}
        {children.length > 0 && (
             <svg width={120} height={coupleToChildrenConnectorHeight} className="my-1">
               <g 
                 onClick={(e) => { 
                    e.stopPropagation(); 
                    if (children.length > 0) {
                        onConnectionClick(person.id, children[0].id, 'parent-child');
                    }
                 }} 
                 className={"cursor-pointer group"}
               >
                 <LinePaths
                    path={`M 60 0 L 60 ${coupleToChildrenConnectorHeight}`}
                    isHighlighted={children.some(c => isConnectionHighlighted(person.id, c.id))}
                    isHoverHighlighted={children.some(c => isLineHoverHighlighted(person.id, c.id))}
                 />
                 <text x="68" y={coupleToChildrenConnectorHeight / 2} textAnchor="start" dominantBaseline="middle" className="line-label">
                    მშობლები
                </text>
               </g>
             </svg>
        )}

        {/* Children container */}
        {children.length > 0 && (
          <div className="flex justify-center items-start mt-0">
            {children.map((child) => (
              <div key={child.id} className={`${isCompact ? 'px-4' : 'px-4'}`}>
                {/* Recursive call with parentId to enable child line interaction */}
                <TreeNode
                  personId={child.id}
                  viewRootId={viewRootId}
                  people={people}
                  onAdd={onAdd}
                  onEdit={onEdit}
                  onShowDetails={onShowDetails}
                  onNavigate={onNavigate}
                  highlightedPersonId={highlightedPersonId}
                  highlightedPeople={highlightedPeople}
                  onConnectionClick={onConnectionClick}
                  hoveredConnections={hoveredConnections}
                  onSetHover={onSetHover}
                  viewMode={viewMode}
                  parentId={person.id}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TreeNode;