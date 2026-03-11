export interface Section {
    sectionId:string,
    sectionHeading:string,
    sectionDescription:string,
    cardConfig:{
        cardHeading:string,
        banner:string
        route:string,
        technologyStack:string[],
        cardDescription:string,
        cardLinks:{label:string, link:string}[],
        cardStyles:string
    }[],
    sectionStyles:{
        container:string,
        wrapper:string,
        leftColumn:string,
        rightColumn:string
    }
}