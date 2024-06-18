import{R as E,r as l,j as e,S as w,T as B,B as u,M as k,h as $,E as I,a3 as _,Q as q}from"./index-daad4356.js";import{u as z}from"./use-router-18eaa0c5.js";import{A as x}from"./admin-0dbd15a2.js";import{C as R}from"./Container-f3314c34.js";import{C as W}from"./Card-3a4c491b.js";import{G as f}from"./Grid-54c1b107.js";import{T as G,F as h}from"./TextField-258936d7.js";import{F as b,I as M}from"./FormControl-8b94c86a.js";import{S as N}from"./Select-7e1876e1.js";import"./isMuiElement-f622d2cf.js";const c={100:"#DAECFF",200:"#b6daff",400:"#3399FF",500:"#007FFF",600:"#0072E5",900:"#003A75"},a={50:"#F3F6F9",100:"#E5EAF2",200:"#DAE2ED",300:"#C7D0DD",400:"#B0B8C4",500:"#9DA8B7",600:"#6B7A90",700:"#434D5B",800:"#303740",900:"#1C2025"},V=I(_)(({theme:s})=>`
      box-sizing: border-box;
      width: 320px;
      font-family: 'IBM Plex Sans', sans-serif;
      font-size: 0.875rem;
      font-weight: 400;
      line-height: 1.5;
      padding: 8px 12px;
      border-radius: 8px;
      color: ${s.palette.mode==="dark"?a[300]:a[900]};
      background: ${s.palette.mode==="dark"?a[900]:"#fff"};
      border: 1px solid ${s.palette.mode==="dark"?a[700]:a[200]};
      box-shadow: 0px 2px 2px ${s.palette.mode==="dark"?a[900]:a[50]};

      &:hover {
        border-color: ${c[400]};
      }

      &:focus {
        border-color: ${c[400]};
        box-shadow: 0 0 0 3px ${s.palette.mode==="dark"?c[600]:c[200]};
      }

      // firefox
      &:focus-visible {
        outline: 0;
      }
    `);function ee(){const s=z(),[d,g]=E.useState(""),[j,C]=l.useState([]),F=t=>{g(t.target.value)},[r,T]=l.useState({name:"",description:""}),[i,p]=l.useState({name:!1,description:!1}),m=t=>{const{id:o,value:n}=t.target;T({...r,[o]:n}),p({...i,[o]:!1})},S=async t=>{t.preventDefault();const o={};if(r.name||(o.name=!0),r.description||(o.description=!0),d||(o.selecttopic=!0),p(o),Object.keys(o).length===0){try{const A=q("Admin_data")._id,{name:D}=r,{description:v}=r;(await x.addSubTopic(A,D,v,d)).status===!0?s.push("/subtopic"):console.log("hiii")}catch(n){console.log(n)}console.log("Form submitted:",r)}},y=async()=>{try{const t=await x.getAllTopics();C(t.data)}catch(t){console.error("Error fetching data:",t)}};return l.useEffect(()=>{y()},[]),e.jsxs(R,{maxWidth:"xl",children:[e.jsx(w,{direction:"row",alignItems:"center",justifyContent:"space-between",mb:5,children:e.jsx(B,{variant:"h4",children:"Add Sub-Topic"})}),e.jsx(W,{children:e.jsx(u,{sx:{flexGrow:1,marginTop:"10px"},children:e.jsx(f,{container:!0,spacing:2,justifyContent:"center",children:e.jsx(f,{item:!0,xs:6,md:6,sm:10,children:e.jsx(u,{component:"form",sx:{"& .MuiTextField-root":{m:2}},noValidate:!0,autoComplete:"off",onSubmit:S,children:e.jsxs("div",{children:[e.jsx(G,{className:"add_quiz_filed",fullWidth:!0,required:!0,id:"name",label:"Sub Topic Name",value:r.name,onChange:m,error:i.name,helperText:i.name?"Topic Name is required":""}),e.jsxs(b,{fullWidth:!0,sx:{margin:"16px"},children:[e.jsx(M,{id:"demo-simple-select-label",children:"Topic"}),e.jsx(N,{className:"add_quiz_filed",labelId:"demo-simple-select-label",id:"demo-simple-select",value:d,label:"SelectCategory",onChange:F,children:j.map(t=>e.jsx(k,{value:t._id,children:t.name}))}),i.selecttopic&&e.jsx(h,{sx:{color:"red"},children:"Topic is required"})]}),e.jsxs(b,{fullWidth:!0,error:i.description,sx:{m:2},children:[e.jsx(V,{minRows:5,"aria-label":"Description",placeholder:"Description",id:"description",value:r.description,onChange:m,style:{width:"100%",borderRadius:"10px",borderColor:i.description?"#FF5630":" ",padding:"16.5px 14px",font:"inherit",letterSpacing:"inherit",color:"currentColor",fontWeight:500}}),i.description&&e.jsx(h,{children:"Description is required"})]}),e.jsx("div",{style:{marginBottom:"10px",textAlign:"center"},children:e.jsx($,{variant:"contained",color:"inherit",type:"submit",children:"Submit"})})]})})})})})})]})}export{ee as default};
