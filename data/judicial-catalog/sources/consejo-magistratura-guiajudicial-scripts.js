/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function abreconcurso2(){

var x= $('#buscador_input').val();
if ($.isNumeric(x)){abreconcurso(x)}
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function abreconcurso(N){
    if ($(window).width()>800) {

$('#area0').load('concurso.php?id='+N).animate({left: "0"}, "fast");
$('#area1').animate({width:"38%"}, "fast");
$('#area0').show()
}
else{$('#area0').load('concurso.php?id='+N)
$('#area1').hide();
$('#area0').slideDown();}
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function cerrar() {
	if ($(window).width()>800) {
$('#area0').animate({left: "-22%"}, "fast");
$('#area1').animate({width: "60%"}, "fast");

}
else{
$('#area0').slideUp();
$('#area1').show()};

}
 /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 function aclaracion(){
  $('#aclaracion').click(function(event){event.stopPropagation();})
  $('#modalito').fadeIn();
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function sinmodalito(){
$('#modalito').fadeOut();
}


 /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function atras() {
 map.setZoom(4);
 map.setCenter({lat: -41, lng: -63});
 $('#contenido').hide();
$("#coldatos").show();
t1.setOptions({fillOpacity:0.15, strokeWeight:0});
t2.setOptions({fillOpacity:0.15, strokeWeight:0});
t3.setOptions({fillOpacity:0.15, strokeWeight:0});
t4.setOptions({fillOpacity:0.15, strokeWeight:0});
t5.setOptions({fillOpacity:0.15, strokeWeight:0});
t6.setOptions({fillOpacity:0.15, strokeWeight:0});
t7.setOptions({fillOpacity:0.15, strokeWeight:0});
t8.setOptions({fillOpacity:0.15, strokeWeight:0});
t9.setOptions({fillOpacity:0.15, strokeWeight:0});
t10.setOptions({fillOpacity:0.15, strokeWeight:0});
t11.setOptions({fillOpacity:0.15, strokeWeight:0});
t12.setOptions({fillOpacity:0.15, strokeWeight:0});
t13.setOptions({fillOpacity:0.15, strokeWeight:0});
t14.setOptions({fillOpacity:0.15, strokeWeight:0});
t15.setOptions({fillOpacity:0.15, strokeWeight:0});
t16.setOptions({fillOpacity:0.15, strokeWeight:0});
t18.setOptions({fillOpacity:0.15, strokeWeight:0});
pintada=0;
 }

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function azul(Q) {
var n = '#etiqueta'+Q;
$(n).addClass("azul");
 }

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function blanco(Q) {
var n = '#etiqueta'+Q;
$(n).removeClass("azul");
 }

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function borrar() {
 for (var i = 0; i < markers.length; i++) {markers[i].setMap();}
 markers = [];
 }


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function caba(){
  var parametros = {
          "id" : 1
  };
  $.ajax({
          data:  parametros, //datos que se envian a traves de ajax
          url:   'marcadores.php', //archivo que recibe la peticion
          type:  'post', //método de envio
          success:  function (response) { //una vez que el archivo recibe el request lo procesa y lo devuelve
            borrar();
            $.each(response, function(i, item) {
               //marcador(-34.600178, -58.3860469, "PRUEBA", "AMERICA", "4587-9864")
               //marcadoresRegion(response[i].LATITUD, response[i].LONGITUD)
               marcadoresRegion(Number(response[i].LATITUD), Number(response[i].LONGITUD), response[i].NOMBRE, response[i].DOMICILIO, response[i].TELEFONO);
            });
          },
          error: function (request, status, error) {
              alert(request.responseText);
          }
  });
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function cambie(Q){
var n = document.getElementById(Q);
if($(n).css('display') == 'none'){ 
   	$(n).show(); 
	$('#etiqueta'+Q).addClass("azul");

} else { 
   	$(n).hide();	$('#etiqueta'+Q).removeClass("azul");
}
if (Q!="2") {$('#2').hide();$('#etiqueta2').removeClass("azul");}
if (Q!="1668") {$('#1668').hide();$('#etiqueta1668').removeClass("azul");}
if (Q!="142") {$('#142').hide();$('#etiqueta142').removeClass("azul");}
if (Q!="151") {$('#151').hide();$('#etiqueta151').removeClass("azul");}
if (Q!="210") {$('#210').hide();$('#etiqueta210').removeClass("azul");}
if (Q!="935") {$('#935').hide();$('#etiqueta935').removeClass("azul");}
}

function cambie2(Q){
var n = document.getElementById(Q);
if($(n).css('display') == 'none'){ 
    $(n).show(); 
  $('#etiqueta'+Q).addClass("azul");

} else { 
    $(n).hide();  $('#etiqueta'+Q).removeClass("azul");
}
/*if (Q!="2") {$('#2').hide();$('#etiqueta2').removeClass("azul");}
if (Q!="1668") {$('#1668').hide();$('#etiqueta1668').removeClass("azul");}
if (Q!="142") {$('#142').hide();$('#etiqueta142').removeClass("azul");}
if (Q!="151") {$('#151').hide();$('#etiqueta151').removeClass("azul");}
if (Q!="210") {$('#210').hide();$('#etiqueta210').removeClass("azul");}
if (Q!="935") {$('#935').hide();$('#etiqueta935').removeClass("azul");}*/
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function cierraconcurso() {
$('#area0').hide();
$('#area1').width('60%');

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function datos(i){
  var parametros = {
          "id" : Number(i)
  };
  $.ajax({
          data:  parametros, //datos que se envian a traves de ajax
          url:   'marcadores.php', //archivo que recibe la peticion
          type:  'post', //método de envio
          success:  function (response) { //una vez que el archivo recibe el request lo procesa y lo devuelve
            borrar();
            $.each(response, function(i, item) {
               //marcador(-34.600178, -58.3860469, "PRUEBA", "AMERICA", "4587-9864")
               //marcadoresRegion(response[i].LATITUD, response[i].LONGITUD)
               marcadoresRegion(Number(response[i].LATITUD), Number(response[i].LONGITUD), response[i].NOMBRE, response[i].DOMICILIO, response[i].TELEFONO);
            });
          },
          error: function (request, status, error) {
              alert(request.responseText);
          }
  });
/*$("#mensaje").empty();
$("#mensaje").load("consultas.php?j="+i);
$('#contenido').show();
$("#coldatos").hide();*/
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function pinta(r){
r.setOptions({fillOpacity: 0.4})
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function despinta(r){
r.setOptions({fillOpacity: 0})
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function encaba(nombre,lat,lng){
infoWindow = new google.maps.InfoWindow;
infoWindow.setContent(nombre);
var capital = new google.maps.LatLng(lat,lng);
infoWindow.setPosition(capital);
console.log(capital);
infoWindow.open(map);
t1.setOptions({fillOpacity:0.4});
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function noencaba(nombre){
t1.setOptions({fillOpacity:0.15});
infoWindow.close()}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
$(document).keyup(function(e) {
if (e.keyCode == 27) { 
sinmodalito();}
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 
function limpia(i) {

if (i>12){t1.setOptions({fillOpacity: 0.15})}else{t1.setOptions({fillOpacity: 0.4});}
if (i!=12){t2.setOptions({fillOpacity: 0.15})}else{t2.setOptions({fillOpacity: 0.4});}
if (i!=13){t3.setOptions({fillOpacity: 0.15})}else{t3.setOptions({fillOpacity: 0.4});}
if (i!=14){t4.setOptions({fillOpacity: 0.15})}else{t4.setOptions({fillOpacity: 0.4});}
if (i!=15){t5.setOptions({fillOpacity: 0.15})}else{t5.setOptions({fillOpacity: 0.4});}
if (i!=16){t6.setOptions({fillOpacity: 0.15})}else{t6.setOptions({fillOpacity: 0.4});}
if (i!=17){t7.setOptions({fillOpacity: 0.15})}else{t7.setOptions({fillOpacity: 0.4});}
if (i!=18){t8.setOptions({fillOpacity: 0.15})}else{t8.setOptions({fillOpacity: 0.4});}
if (i!=19){t9.setOptions({fillOpacity: 0.15})}else{t9.setOptions({fillOpacity: 0.4});}
if (i!=20){t10.setOptions({fillOpacity: 0.15})}else{t10.setOptions({fillOpacity: 0.4});}
if (i!=21){t11.setOptions({fillOpacity: 0.15})}else{t11.setOptions({fillOpacity: 0.4});}
if (i!=22){t12.setOptions({fillOpacity: 0.15})}else{t12.setOptions({fillOpacity: 0.4});}
if (i!=23){t13.setOptions({fillOpacity: 0.15})}else{t13.setOptions({fillOpacity: 0.4});}
if (i!=24){t14.setOptions({fillOpacity: 0.15})}else{t14.setOptions({fillOpacity: 0.4});}
if (i!=25){t15.setOptions({fillOpacity: 0.15})}else{t15.setOptions({fillOpacity: 0.4});}
if (i!=26){t16.setOptions({fillOpacity: 0.15})}else{t16.setOptions({fillOpacity: 0.4});}
if (i!=28){t16.setOptions({fillOpacity: 0.15})}else{t18.setOptions({fillOpacity: 0.4});}

}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function prendet(i) {
if (i!=1){t1.setOptions({fillOpacity: 0.15})}else{t1.setOptions({fillOpacity: 0.4});}
if (i!=2){t2.setOptions({fillOpacity: 0.15})}else{t2.setOptions({fillOpacity: 0.4});}
if (i!=3){t3.setOptions({fillOpacity: 0.15});t18.setOptions({fillOpacity: 0.15})}else{t3.setOptions({fillOpacity: 0.4});t18.setOptions({fillOpacity: 0.4});}
if (i!=4){t4.setOptions({fillOpacity: 0.15})}else{t4.setOptions({fillOpacity: 0.4});}
if (i!=5){t5.setOptions({fillOpacity: 0.15})}else{t5.setOptions({fillOpacity: 0.4});}
if (i!=6){t6.setOptions({fillOpacity: 0.15})}else{t6.setOptions({fillOpacity: 0.4});}
if (i!=7){t7.setOptions({fillOpacity: 0.15})}else{t7.setOptions({fillOpacity: 0.4});}
if (i!=8){t8.setOptions({fillOpacity: 0.15})}else{t8.setOptions({fillOpacity: 0.4});}
if (i!=9){t9.setOptions({fillOpacity: 0.15})}else{t9.setOptions({fillOpacity: 0.4});}
if (i!=10){t10.setOptions({fillOpacity: 0.15})}else{t10.setOptions({fillOpacity: 0.4});}
if (i!=11){t11.setOptions({fillOpacity: 0.15})}else{t11.setOptions({fillOpacity: 0.4});}
if (i!=12){t12.setOptions({fillOpacity: 0.15})}else{t12.setOptions({fillOpacity: 0.4});}
if (i!=13){t13.setOptions({fillOpacity: 0.15})}else{t13.setOptions({fillOpacity: 0.4});}
if (i!=14){t14.setOptions({fillOpacity: 0.15})}else{t14.setOptions({fillOpacity: 0.4});}
if (i!=15){t15.setOptions({fillOpacity: 0.15})}else{t15.setOptions({fillOpacity: 0.4});}
if (i!=16){t16.setOptions({fillOpacity: 0.15})}else{t16.setOptions({fillOpacity: 0.4});}
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function limpiar(i) {
 if (i!=1 || pintada==1){ r1.setOptions({fillOpacity: 0})}else{r1.setOptions({fillOpacity: 0.25});}
 if (i!=2 || pintada==2){ r2.setOptions({fillOpacity: 0})}else{r2.setOptions({fillOpacity: 0.25});}
 if (i!=3 || pintada==3){ r3.setOptions({fillOpacity: 0}),r18.setOptions({fillOpacity: 0}) }else{r3.setOptions({fillOpacity: 0.25}),r18.setOptions({fillOpacity: 0.25});}
  if (i!=4 || pintada==4){ r4.setOptions({fillOpacity: 0})}else{r4.setOptions({fillOpacity: 0.25});}
 if (i!=5 || pintada==5){ r5.setOptions({fillOpacity: 0})}else{r5.setOptions({fillOpacity: 0.25});}
 if (i!=6 || pintada==6){ r6.setOptions({fillOpacity: 0})}else{r6.setOptions({fillOpacity: 0.25});}
 if (i!=7 || pintada==7){ r7.setOptions({fillOpacity: 0})}else{r7.setOptions({fillOpacity: 0.25});}
 if (i!=8 || pintada==8){ r8.setOptions({fillOpacity: 0})}else{r8.setOptions({fillOpacity: 0.25});}
 if (i!=9 || pintada==9){ r9.setOptions({fillOpacity: 0})}else{r9.setOptions({fillOpacity: 0.25});}
 if (i!=10 || pintada==10){ r10.setOptions({fillOpacity: 0})}else{r10.setOptions({fillOpacity: 0.25});}
 if (i!=11 || pintada==11){ r11.setOptions({fillOpacity: 0})}else{r11.setOptions({fillOpacity: 0.25});}
 if (i!=12 || pintada==12){ r12.setOptions({fillOpacity: 0})}else{r12.setOptions({fillOpacity: 0.25});}
 if (i!=13 || pintada==13){ r13.setOptions({fillOpacity: 0})}else{r13.setOptions({fillOpacity: 0.25});}
 if (i!=14 || pintada==14){ r14.setOptions({fillOpacity: 0})}else{r14.setOptions({fillOpacity: 0.25});}
 if (i!=15 || pintada==15){ r15.setOptions({fillOpacity: 0})}else{r15.setOptions({fillOpacity: 0.25});}
 if (i!=16 || pintada==16){ r16.setOptions({fillOpacity: 0})}else{r16.setOptions({fillOpacity: 0.25});} 
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function colordoble(event) {
  this.setOptions({fillOpacity: 0.25})
 }
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 function color(event) {
 this.setOptions({fillOpacity: 0});
 }
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function normal(event){
 this.setOptions({fillOpacity: 0.15});
     }
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 function lug_hover(i){
var t = document.getElementById(i);
$(t).removeClass("lugar").addClass("lugarhover"); 
 }

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function lug_normal(i){
var t = document.getElementById(i);

$(t).removeClass("lugarhover").addClass("lugar");

}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function clearOverlays() {
  for (var i = 0; i < markersArray.length; i++ ) {
    markersArray[i].setMap(null);
  }
  markersArray.length = 0;
}

function marcador (latitud, longitud, nombre, domicilio, telefono) {
  borrar();
  const myLatLng = { lat: latitud, lng: longitud};
  var marker = new google.maps.Marker({
                                        position:myLatLng, 
                                        map, 
                                        animation: google.maps.Animation.DROP,icon:'icono-off-glow.png',
                                        title: nombre});

  const contentString = nombre + "</br> " + domicilio + "</br> " + telefono;
  markers.push(marker);
  const infowindow = new google.maps.InfoWindow({
    content: contentString,
  });

  marker.addListener("click", () => {
    infowindow.open({
      anchor: marker,
      map,
      shouldFocus: false,
    });
  });
  map.setZoom(12);
  map.panTo(marker.position);
}

function marcadoresRegion (latitud, longitud, nombre, domicilio, telefono) {
  const myLatLng = { lat: Number(latitud), lng: Number(longitud)};
  var marker = new google.maps.Marker({
                                        position:myLatLng, 
                                        map, 
                                        animation: google.maps.Animation.DROP,icon:'icono-off-glow.png',
                                        title: nombre});
  
  markers.push(marker);
  
  const contentString = nombre + "</br> " + domicilio + "</br> " + telefono;
  markers.push(marker);
  const infowindow = new google.maps.InfoWindow({
    content: contentString,
  });

  marker.addListener("click", () => {
    infowindow.open({
      anchor: marker,
      map,
      shouldFocus: false,
    });
  });
  map.setZoom(6);
  map.panTo(marker.position);
}

function consultaIntegrantes(id){
        var parametros = {
                "id" : id
        };
        $.ajax({
                data:  parametros, //datos que se envian a traves de ajax
                url:   'integrantes.php', //archivo que recibe la peticion
                type:  'post', //método de envio
                success:  function (response) { //una vez que el archivo recibe el request lo procesa y lo devuelve
                        $("#dialog").html(response);
                        $("#dialog").dialog();
                        $("#dialog").dialog("open");
                }
        });
}