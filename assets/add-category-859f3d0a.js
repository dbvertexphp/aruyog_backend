import{r as p,j as e,S as C,T as F,B as m,h as j,E as y,a3 as A,Q as D}from"./index-daad4356.js";import{u as E}from"./use-router-18eaa0c5.js";import{A as v}from"./admin-0dbd15a2.js";import{C as w}from"./Container-f3314c34.js";import{C as B}from"./Card-3a4c491b.js";import{G as u}from"./Grid-54c1b107.js";import{T,F as k}from"./TextField-258936d7.js";import{F as S}from"./FormControl-8b94c86a.js";import"./Select-7e1876e1.js";import"./isMuiElement-f622d2cf.js";const n={100:"#DAECFF",200:"#b6daff",400:"#3399FF",500:"#007FFF",600:"#0072E5",900:"#003A75"},i={50:"#F3F6F9",100:"#E5EAF2",200:"#DAE2ED",300:"#C7D0DD",400:"#B0B8C4",500:"#9DA8B7",600:"#6B7A90",700:"#434D5B",800:"#303740",900:"#1C2025"},$=y(A)(({theme:o})=>`
      box-sizing: border-box;
      width: 320px;
      font-family: 'IBM Plex Sans', sans-serif;
      font-size: 0.875rem;
      font-weight: 400;
      line-height: 1.5;
      padding: 8px 12px;
      border-radius: 8px;
      color: ${o.palette.mode==="dark"?i[300]:i[900]};
      background: ${o.palette.mode==="dark"?i[900]:"#fff"};
      border: 1px solid ${o.palette.mode==="dark"?i[700]:i[200]};
      box-shadow: 0px 2px 2px ${o.palette.mode==="dark"?i[900]:i[50]};

      &:hover {
        border-color: ${n[400]};
      }

      &:focus {
        border-color: ${n[400]};
        box-shadow: 0 0 0 3px ${o.palette.mode==="dark"?n[600]:n[200]};
      }

      // firefox
      &:focus-visible {
        outline: 0;
      }
    `);function O(){const o=E(),[r,x]=p.useState({name:"",description:""}),[s,l]=p.useState({name:!1,description:!1}),c=d=>{const{id:t,value:a}=d.target;x({...r,[t]:a}),l({...s,[t]:!1})},f=async d=>{d.preventDefault();const t={};if(r.name||(t.name=!0),r.description||(t.description=!0),l(t),Object.keys(t).length===0){try{const h=D("Admin_data")._id,{name:g}=r,{description:b}=r;(await v.addCategory(h,g,b)).status===!0?o.push("/category"):console.log("hiii")}catch(a){console.log(a)}console.log("Form submitted:",r)}};return e.jsxs(w,{maxWidth:"xl",children:[e.jsx(C,{direction:"row",alignItems:"center",justifyContent:"space-between",mb:5,children:e.jsx(F,{variant:"h4",children:"Add Category"})}),e.jsx(B,{children:e.jsx(m,{sx:{flexGrow:1,marginTop:"10px"},children:e.jsx(u,{container:!0,spacing:2,justifyContent:"center",children:e.jsx(u,{item:!0,xs:6,md:6,sm:10,children:e.jsx(m,{component:"form",sx:{"& .MuiTextField-root":{m:2}},noValidate:!0,autoComplete:"off",onSubmit:f,children:e.jsxs("div",{children:[e.jsx(T,{className:"add_quiz_filed",fullWidth:!0,required:!0,id:"name",label:"Category Name",value:r.name,onChange:c,error:s.name,helperText:s.name?"Category Name is required":""}),e.jsxs(S,{fullWidth:!0,error:s.description,sx:{m:2},children:[e.jsx($,{minRows:5,"aria-label":"Description",placeholder:"Description",id:"description",value:r.description,onChange:c,style:{width:"100%",borderRadius:"10px",borderColor:s.description?"#FF5630":" ",padding:"16.5px 14px",font:"inherit",letterSpacing:"inherit",color:"currentColor",fontWeight:500}}),s.description&&e.jsx(k,{children:"Description is required"})]}),e.jsx("div",{style:{marginBottom:"10px",textAlign:"center"},children:e.jsx(j,{variant:"contained",color:"inherit",type:"submit",children:"Submit"})})]})})})})})})]})}export{O as default};
