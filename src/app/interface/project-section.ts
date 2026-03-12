export interface ProjectSection {
    sectionId: string;
    sectionHeading: string;
    sectionDescription: string;
    sectionIcon: string;
    cardConfig: {
        cardIcon: string;
        cardHeading: string;
        cardDescription: string;
        cardStyle: string;
        // NEW: For technical bullet points (e.g., Backend Actions)
        details?: string[]; 
        // NEW: To label the list (e.g., "USER EXPERIENCE" vs "BACKEND ACTIONS")
        detailLabel?: string; 
    }[];
    sectionStyles: {
        containerstyle: string;
        iconWrapperstyle: string; 
        iconstyle: string;         
        titlestyle: string;       
        descriptionstyle: string;
    };
    // NEW: For complex text like the Monorepo Tree or code blocks
    rawContent?: string; 
}