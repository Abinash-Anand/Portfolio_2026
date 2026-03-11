export interface ProjectSection{
    sectionId:string,
    sectionHeading:string,
    sectionDescription:string,
    sectionIcon:string,
    cardConfig:{
        cardIcon:string,
        cardHeading:string,
        cardDescription:string
        cardStyle:string
    }[],
    sectionStyles:{
        containerstyle: string;
        iconWrapperstyle: string; 
        iconstyle: string;        
        titlestyle: string;      
        descriptionstyle: string;
    }


}