declare module 'react-plotly.js' {
    import Plotly from 'plotly.js-dist-min';
    import { Component } from 'react';

    interface PlotParams {
        data: Plotly.Data[];
        layout?: Partial<Plotly.Layout>;
        config?: Partial<Plotly.Config>;
        style?: React.CSSProperties;
        className?: string;
        onInitialized?: (figure: any, graphDiv: HTMLElement) => void;
        onUpdate?: (figure: any, graphDiv: HTMLElement) => void;
        onPurge?: (figure: any, graphDiv: HTMLElement) => void;
        onError?: (err: Error) => void;
    }

    class Plot extends Component<PlotParams> { }

    export default Plot;
}

declare module 'plotly.js-dist-min' {
    export interface Data {
        type?: string;
        x?: any[];
        y?: any[];
        z?: any[][];
        labels?: string[];
        parents?: string[];
        values?: number[];
        name?: string;
        marker?: any;
        textinfo?: string;
        colorscale?: any;
        showscale?: boolean;
        connector?: any;
        increasing?: any;
        decreasing?: any;
        totals?: any;
        boxpoints?: string;
        meanline?: any;
        fillcolor?: string;
        line?: any;
        box?: any;
        [key: string]: any;
    }

    export interface Layout {
        autosize?: boolean;
        margin?: { l?: number; r?: number; t?: number; b?: number };
        paper_bgcolor?: string;
        plot_bgcolor?: string;
        font?: any;
        [key: string]: any;
    }

    export interface Config {
        responsive?: boolean;
        displayModeBar?: boolean;
        [key: string]: any;
    }
}
