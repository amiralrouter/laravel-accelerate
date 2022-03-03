# Laravel Accelerate

Automatically fill **casts** and **migration table columns** with model's attributes.

just press  
CTRL + L - CTRL + C

![Laravel Accelerate](https://github.com/amiralrouter/laravel-accelerate/blob/main/images/preview.gif?raw=true)

 
## Attributions
// [type:integer, dbType: float, default:2, model: Business, foreignId:id, foreignTable:businesses] *description of the attribute*  
  
**type** : integer, string, float, array etc - *casting and Database column type*  
**dbType** : float, integer, string etc - *database column type. if it defined, it will be used instead of type for database column type*  
**default** : *default value*  
**model** : *if the attribute is a model, this is the model name*  
**foreignId** : *if the attribute is a model, this is the foreign key*  
**foreignTable** :  *if the attribute is a model, this is the foreign table*  
  
**nullable** : true/false - *if the attribute can be null*  
**index** : true/false - *if the attribute should be indexed*  
**unsigned** : true/false - *if the attribute is unsigned*  
**unique** : true/false - *if the attribute is unique*  
 
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Translatable\HasTranslations;

class Category extends Model
{
	use HasTranslations;

	public $timestamps = false;

	public $translatable = [
		'name', 'slug', 'description',
	];

	protected $attributes = [
		'business_id' => 1, // [type:integer, model: Business] Business ID
        'parent_id' => 0, // [type:integer, model: Category] Parent ID
        'order' => 0, // [type:integer] Order of the category
        'is_active' => true, // [type:boolean, default:true] Is the category active?
        'is_featured' => false, // [type:boolean, default:false] Is the category featured?
        'image_path' => null, // [type:string, size: 128, nullable:true] Image path
        'avarage_rating' => 0, // [type:float, default:0] Avarage rating
	]; 

	protected $casts = [ ];

	protected $appends = [];

	protected $guarded = [];

	protected $hidden = [];
} 
```

update **$casts** array with **\$attributes** as follows:
```php
// ....
// ....
protected $casts = [
    'business_id' => 'integer',
    'parent_id' => 'integer',
    'order' => 'integer',
    'is_active' => 'boolean',
    'is_featured' => 'boolean',
    'image_path' => 'string',
    'avarage_rating' => 'float'
];
// ....
// ....
```

update **...._create_categories_table.php** as follows:
```php
// ....
// ....
public function up(): void
{
    Schema::create('categories', function (Blueprint $table): void {
        $table->id();
        $table->json('name')->default('{}')->comment('Translatable name');
        $table->json('slug')->default('{}')->comment('Translatable slug');
        $table->json('description')->default('{}')->comment('Translatable description');
        $table->foreignId('business_id')->constrained()->onUpdate('cascade')->onDelete('cascade')->comment('Business ID');
        $table->foreignId('parent_id')->constrained()->onUpdate('cascade')->onDelete('cascade')->comment('Parent ID');
        $table->integer('order')->comment('Order of the category');
        $table->boolean('is_active')->default(true)->comment('Is the category active?');
        $table->boolean('is_featured')->default(false)->comment('Is the category featured?');
        $table->string('image_path, 128')->nullable()->comment('Image path');
        $table->float('avarage_rating')->default(0)->comment('Avarage rating');
        // custom
        $table->foreignId('custom_xna_id')->constrained()->onUpdate('cascade')->onDelete('cascade')->comment('Business ID');
    });
}
// ....
// ....
```